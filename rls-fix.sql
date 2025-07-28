-- Fix RLS Policies for One Sentence Story
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- ==== STEP 1: Remove all existing restrictive policies ====

-- Drop existing policies for submissions table
DROP POLICY IF EXISTS "Users can view all submissions" ON submissions;
DROP POLICY IF EXISTS "Users can insert submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update submissions" ON submissions;
DROP POLICY IF EXISTS "Allow vote count updates" ON submissions;
DROP POLICY IF EXISTS "Public read access" ON submissions;
DROP POLICY IF EXISTS "Authenticated users can update votes" ON submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON submissions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON submissions;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON submissions;

-- Drop existing policies for votes table
DROP POLICY IF EXISTS "Users can view all votes" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Users can update votes" ON votes;
DROP POLICY IF EXISTS "Enable read access for all users" ON votes;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON votes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON votes;

-- Drop existing policies for stories table
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
DROP POLICY IF EXISTS "Users can insert stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;

-- ==== STEP 2: Create permissive policies ====

-- SUBMISSIONS table policies
CREATE POLICY "submissions_select_policy" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "submissions_insert_policy" ON submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "submissions_update_policy" ON submissions
  FOR UPDATE USING (true);  -- Allow all updates (needed for vote counting)

CREATE POLICY "submissions_delete_policy" ON submissions
  FOR DELETE USING (true);  -- Allow deletes (needed for settlement)

-- VOTES table policies  
CREATE POLICY "votes_select_policy" ON votes
  FOR SELECT USING (true);

CREATE POLICY "votes_insert_policy" ON votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "votes_update_policy" ON votes
  FOR UPDATE USING (true);

CREATE POLICY "votes_delete_policy" ON votes
  FOR DELETE USING (true);  -- Allow deletes (needed for settlement)

-- STORIES table policies
CREATE POLICY "stories_select_policy" ON stories
  FOR SELECT USING (true);

CREATE POLICY "stories_insert_policy" ON stories
  FOR INSERT WITH CHECK (true);  -- Allow story creation

CREATE POLICY "stories_update_policy" ON stories
  FOR UPDATE USING (true);  -- Allow story updates (needed for settlement)

CREATE POLICY "stories_delete_policy" ON stories
  FOR DELETE USING (true);

-- ==== STEP 3: Ensure RLS is enabled ====
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- ==== STEP 4: Grant necessary permissions ====

-- Grant permissions to authenticated users
GRANT ALL ON submissions TO authenticated;
GRANT ALL ON votes TO authenticated;
GRANT ALL ON stories TO authenticated;

-- Grant read permissions to anonymous users
GRANT SELECT ON submissions TO anon;
GRANT SELECT ON votes TO anon;
GRANT SELECT ON stories TO anon;

-- Grant usage on sequences (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ==== STEP 5: Create the vote increment function (if it doesn't exist) ====
CREATE OR REPLACE FUNCTION increment_votes(submission_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_vote_count INTEGER;
BEGIN
  -- Atomically increment the votes column and return new value
  UPDATE submissions 
  SET votes = votes + 1 
  WHERE id = submission_id
  RETURNING votes INTO new_vote_count;
  
  -- Return the new vote count
  RETURN new_vote_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_votes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_votes(UUID) TO anon;

-- ==== STEP 6: Verify the setup ====

-- Check that policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('submissions', 'votes', 'stories')
ORDER BY tablename, cmd;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('submissions', 'votes', 'stories') 
  AND schemaname = 'public';

-- Check current vote counts (optional)
SELECT id, content, votes FROM submissions ORDER BY created_at DESC LIMIT 5;