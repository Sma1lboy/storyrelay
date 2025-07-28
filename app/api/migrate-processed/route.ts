import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('Adding processed column to submissions table...')
    
    // Add processed column to submissions table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE submissions 
        ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
        
        CREATE INDEX IF NOT EXISTS idx_submissions_processed 
        ON submissions(processed);
        
        CREATE INDEX IF NOT EXISTS idx_submissions_processed_round_end 
        ON submissions(processed, round_end);
      `
    })

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ error: 'Migration failed: ' + error.message }, { status: 500 })
    }

    console.log('Successfully added processed column and indexes')
    
    return NextResponse.json({ 
      success: true,
      message: 'Added processed column to submissions table with indexes'
    })
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}