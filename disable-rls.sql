-- Completely disable RLS for all tables
-- Copy and paste this into Supabase SQL Editor

-- Disable RLS on all main tables
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;

-- Optional: Drop all existing policies (since RLS is disabled, they won't be used anyway)
DROP POLICY IF EXISTS "submissions_select_policy" ON submissions;
DROP POLICY IF EXISTS "submissions_insert_policy" ON submissions;
DROP POLICY IF EXISTS "submissions_update_policy" ON submissions;
DROP POLICY IF EXISTS "submissions_delete_policy" ON submissions;

DROP POLICY IF EXISTS "votes_select_policy" ON votes;
DROP POLICY IF EXISTS "votes_insert_policy" ON votes;
DROP POLICY IF EXISTS "votes_update_policy" ON votes;
DROP POLICY IF EXISTS "votes_delete_policy" ON votes;

DROP POLICY IF EXISTS "stories_select_policy" ON stories;
DROP POLICY IF EXISTS "stories_insert_policy" ON stories;
DROP POLICY IF EXISTS "stories_update_policy" ON stories;
DROP POLICY IF EXISTS "stories_delete_policy" ON stories;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('submissions', 'votes', 'stories') 
  AND schemaname = 'public';