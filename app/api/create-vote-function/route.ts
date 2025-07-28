import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('Creating increment_votes database function...')
    
    // Create the increment_votes function
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create or replace the increment_votes function
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
        $$ LANGUAGE plpgsql;

        -- Grant execute permission
        GRANT EXECUTE ON FUNCTION increment_votes(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION increment_votes(UUID) TO anon;
      `
    })

    if (error) {
      console.error('Function creation error:', error)
      return NextResponse.json({ error: 'Failed to create function: ' + error.message }, { status: 500 })
    }

    console.log('Successfully created increment_votes function')
    
    return NextResponse.json({ 
      success: true,
      message: 'Created increment_votes database function'
    })
  } catch (error) {
    console.error('Create function API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}