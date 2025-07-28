import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Clear all votes
    await supabase
      .from('votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    // Clear all submissions
    await supabase
      .from('submissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    // Mark all stories as inactive
    await supabase
      .from('stories')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    return NextResponse.json({ 
      success: true, 
      message: 'Database reset completed' 
    })
  } catch (error) {
    console.error('Reset API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}