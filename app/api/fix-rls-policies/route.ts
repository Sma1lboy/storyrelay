import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('=== Checking and fixing RLS policies ===')
    
    // First, check current RLS policies
    const { data: currentPolicies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename IN ('submissions', 'votes');
        `
      });

    console.log('Current policies:', currentPolicies);
    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
    }

    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename IN ('submissions', 'votes') AND schemaname = 'public';
        `
      });

    console.log('RLS status:', rlsStatus);

    // Create comprehensive RLS policies
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies that might be restrictive
        DROP POLICY IF EXISTS "Users can view all submissions" ON submissions;
        DROP POLICY IF EXISTS "Users can insert submissions" ON submissions;
        DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
        DROP POLICY IF EXISTS "Allow vote count updates" ON submissions;
        DROP POLICY IF EXISTS "Public read access" ON submissions;
        DROP POLICY IF EXISTS "Authenticated users can update votes" ON submissions;

        DROP POLICY IF EXISTS "Users can view all votes" ON votes;
        DROP POLICY IF EXISTS "Users can insert votes" ON votes;
        DROP POLICY IF EXISTS "Users can view own votes" ON votes;

        -- Create permissive policies for submissions
        CREATE POLICY "Enable read access for all users" ON submissions
          FOR SELECT USING (true);

        CREATE POLICY "Enable insert access for authenticated users" ON submissions
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable update access for all authenticated users" ON submissions
          FOR UPDATE USING (auth.uid() IS NOT NULL);

        -- Create permissive policies for votes
        CREATE POLICY "Enable read access for all users" ON votes
          FOR SELECT USING (true);

        CREATE POLICY "Enable insert access for authenticated users" ON votes
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable update access for authenticated users" ON votes
          FOR UPDATE USING (auth.uid() IS NOT NULL);

        -- Ensure RLS is enabled
        ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

        -- Grant necessary permissions
        GRANT ALL ON submissions TO authenticated;
        GRANT ALL ON votes TO authenticated;
        GRANT SELECT ON submissions TO anon;
        GRANT SELECT ON votes TO anon;
      `
    });

    if (policyError) {
      console.error('Policy creation error:', policyError);
      return NextResponse.json({ 
        error: 'Failed to create policies: ' + policyError.message 
      }, { status: 500 });
    }

    // Verify the new policies
    const { data: newPolicies } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename IN ('submissions', 'votes');
        `
      });

    console.log('New policies created:', newPolicies);

    return NextResponse.json({ 
      success: true,
      message: 'RLS policies updated successfully',
      oldPolicies: currentPolicies,
      newPolicies: newPolicies,
      rlsStatus: rlsStatus
    });
  } catch (error) {
    console.error('Fix RLS API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}