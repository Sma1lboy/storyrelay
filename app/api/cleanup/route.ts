import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get expired submissions to get their IDs
    const { data: expiredSubmissions, error: fetchError } = await supabase
      .from('submissions')
      .select('id')
      .lt('round_end', new Date().toISOString())

    if (fetchError) {
      return NextResponse.json({ error: 'Error fetching expired submissions' }, { status: 500 })
    }

    if (!expiredSubmissions || expiredSubmissions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expired submissions to clean up',
        cleaned: 0
      })
    }

    const expiredIds = expiredSubmissions.map(s => s.id)

    // Delete votes for expired submissions
    await supabase
      .from('votes')
      .delete()
      .in('submission_id', expiredIds)

    // Delete expired submissions
    await supabase
      .from('submissions')
      .delete()
      .lt('round_end', new Date().toISOString())

    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${expiredSubmissions.length} expired submissions and their votes`,
      cleaned: expiredSubmissions.length
    })
  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}