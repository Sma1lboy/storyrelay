import { getServiceSupabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    console.log('=== Testing Settlement Logic ===')

    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('is_active', true)
      .single()

    if (storyError || !activeStory) {
      return NextResponse.json({ error: 'No active story found' }, { status: 404 })
    }

    const currentTime = new Date().toISOString()

    // Test query: Get unprocessed expired submissions
    const { data: unprocessedSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('story_id', activeStory.id)
      .eq('processed', false)
      .lt('round_end', currentTime)
      .order('round_end', { ascending: false })
      .order('created_at', { ascending: true })

    if (submissionsError) {
      return NextResponse.json({ error: 'Database error: ' + submissionsError.message }, { status: 500 })
    }

    // Also get all submissions for comparison
    const { data: allSubmissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('story_id', activeStory.id)
      .order('created_at', { ascending: false })

    // Get active submissions
    const { data: activeSubmissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('story_id', activeStory.id)
      .gt('round_end', currentTime)

    // Collect all submission IDs to fetch vote counts
    const allSubIds = (allSubmissions || []).map(s => s.id)
    const { data: votes } = await supabase
      .from('votes')
      .select('submission_id')
      .in('submission_id', allSubIds.length > 0 ? allSubIds : ['__none__'])

    // Build vote count map
    const voteCountMap = new Map<string, number>()
    ;(votes || []).forEach(v => {
      const count = voteCountMap.get(v.submission_id) || 0
      voteCountMap.set(v.submission_id, count + 1)
    })

    return NextResponse.json({
      success: true,
      currentTime,
      activeStory: {
        id: activeStory.id,
        contentLength: activeStory.content.length
      },
      statistics: {
        totalSubmissions: allSubmissions?.length || 0,
        unprocessedExpired: unprocessedSubmissions?.length || 0,
        activeSubmissions: activeSubmissions?.length || 0
      },
      unprocessedExpiredSubmissions: (unprocessedSubmissions || []).map(sub => ({
        id: sub.id,
        content: sub.content,
        vote_count: voteCountMap.get(sub.id) || 0,
        round_end: sub.round_end,
        processed: sub.processed,
        created_at: sub.created_at
      })),
      allSubmissions: (allSubmissions || []).map(sub => ({
        id: sub.id,
        content: sub.content,
        vote_count: voteCountMap.get(sub.id) || 0,
        round_end: sub.round_end,
        processed: sub.processed,
        created_at: sub.created_at,
        isExpired: new Date(sub.round_end) < new Date(currentTime),
        isActive: new Date(sub.round_end) > new Date(currentTime)
      }))
    })
  } catch (error) {
    console.error('Test settlement API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}