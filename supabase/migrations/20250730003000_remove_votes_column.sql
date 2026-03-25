-- Migration: Remove denormalized votes column from submissions
-- The votes column was a denormalized count that could get out of sync with
-- the actual votes table. We now compute vote counts from the votes table directly.

-- 1. Create a helper function to get vote count for a submission
CREATE OR REPLACE FUNCTION public.get_vote_count(p_submission_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.votes
  WHERE submission_id = p_submission_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_vote_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_vote_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vote_count(uuid) TO service_role;

-- 2. Create a function to bulk-get vote counts for multiple submissions (used by end-round)
CREATE OR REPLACE FUNCTION public.get_vote_counts(p_submission_ids uuid[])
RETURNS TABLE(submission_id uuid, vote_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    v.submission_id,
    COUNT(*)::integer AS vote_count
  FROM public.votes v
  WHERE v.submission_id = ANY(p_submission_ids)
  GROUP BY v.submission_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_vote_counts(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_vote_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vote_counts(uuid[]) TO service_role;

-- 3. Drop the old increment_votes function (no longer needed)
DROP FUNCTION IF EXISTS public.increment_votes(uuid);

-- 4. Update the unprocessed_expired_submissions view to use computed vote count
CREATE OR REPLACE VIEW public.unprocessed_expired_submissions AS
SELECT
  s.id,
  s.story_id,
  s.content,
  s.user_id,
  s.user_name,
  COALESCE(vc.vote_count, 0) AS votes,
  s.created_at,
  s.round_end,
  s.processed,
  st.content AS story_content,
  st.is_active AS story_is_active
FROM public.submissions s
JOIN public.stories st ON s.story_id = st.id
LEFT JOIN (
  SELECT v.submission_id, COUNT(*)::integer AS vote_count
  FROM public.votes v
  GROUP BY v.submission_id
) vc ON vc.submission_id = s.id
WHERE s.processed = false
  AND s.round_end < now()
  AND st.is_active = true
ORDER BY s.round_end DESC, COALESCE(vc.vote_count, 0) DESC, s.created_at;

-- 5. Drop the old settlement index that references the votes column
DROP INDEX IF EXISTS idx_submissions_settlement;

-- 6. Create a new settlement index without the votes column
CREATE INDEX IF NOT EXISTS idx_submissions_settlement_v2
  ON public.submissions(story_id, processed, round_end DESC, created_at);

COMMENT ON INDEX public.idx_submissions_settlement_v2
  IS 'Settlement index (v2) - votes are now computed from votes table';

-- 7. Drop the votes column from submissions
ALTER TABLE public.submissions DROP COLUMN IF EXISTS votes;
