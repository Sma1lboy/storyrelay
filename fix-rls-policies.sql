-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;

-- Create new RLS policies that allow authenticated users to insert
-- Since we're using Clerk, not Supabase Auth, we'll allow all inserts
-- The API will handle authentication via Clerk middleware

CREATE POLICY "Allow all inserts to submissions" ON submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all inserts to votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Optional: If you want to maintain some security, you can add these policies
-- that check if user_id is not empty (API should validate this)

-- DROP the above policies and use these instead if you prefer:
-- CREATE POLICY "Allow inserts with user_id to submissions" ON submissions
--   FOR INSERT WITH CHECK (user_id IS NOT NULL AND user_id != '');
-- 
-- CREATE POLICY "Allow inserts with user_id to votes" ON votes
--   FOR INSERT WITH CHECK (user_id IS NOT NULL AND user_id != '');