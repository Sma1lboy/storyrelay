-- Fix RLS policies for stories table specifically
-- Run this in Supabase SQL Editor

-- Drop any existing conflicting policies for stories
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
DROP POLICY IF EXISTS "Allow all inserts to stories" ON stories;
DROP POLICY IF EXISTS "Allow all updates to stories" ON stories;

-- Create permissive policies for stories table
-- Since we use Clerk for auth, we allow all operations and handle auth in API

CREATE POLICY "Allow all story operations" ON stories
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'stories';