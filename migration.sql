-- Migration Script: Add processed column and optimize submissions table
-- Run this in your Supabase SQL editor

-- 1. Add processed column to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- 2. Set all existing submissions as unprocessed
UPDATE submissions 
SET processed = FALSE 
WHERE processed IS NULL;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_processed 
ON submissions(processed);

CREATE INDEX IF NOT EXISTS idx_submissions_processed_round_end 
ON submissions(processed, round_end);

CREATE INDEX IF NOT EXISTS idx_submissions_story_processed_round 
ON submissions(story_id, processed, round_end);

-- 4. Add composite index for settlement query optimization
CREATE INDEX IF NOT EXISTS idx_submissions_settlement 
ON submissions(story_id, processed, round_end DESC, votes DESC, created_at ASC);

-- 5. Optional: Add a view for easy querying of unprocessed expired submissions
CREATE OR REPLACE VIEW unprocessed_expired_submissions AS
SELECT 
    s.*,
    st.content as story_content,
    st.is_active as story_is_active
FROM submissions s
JOIN stories st ON s.story_id = st.id
WHERE s.processed = FALSE 
  AND s.round_end < NOW()
  AND st.is_active = TRUE
ORDER BY s.round_end DESC, s.votes DESC, s.created_at ASC;

-- 6. Add comments for documentation
COMMENT ON COLUMN submissions.processed IS 'Whether this submission has been processed by settlement';
COMMENT ON INDEX idx_submissions_settlement IS 'Optimized index for settlement queries';

-- 7. Verify the migration
SELECT 
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE processed = FALSE) as unprocessed,
    COUNT(*) FILTER (WHERE processed = TRUE) as processed,
    COUNT(*) FILTER (WHERE round_end < NOW()) as expired
FROM submissions;

-- Display table structure
\d submissions;