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

-- Make sure SELECT policies exist (these should already be there from database.sql)
-- But let's create them if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'submissions' 
        AND policyname = 'Submissions are viewable by everyone'
    ) THEN
        CREATE POLICY "Submissions are viewable by everyone" ON submissions
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'votes' 
        AND policyname = 'Votes are viewable by everyone'
    ) THEN
        CREATE POLICY "Votes are viewable by everyone" ON votes
            FOR SELECT USING (true);
    END IF;
END $$;