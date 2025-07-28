import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('is_active', true)
      .single()

    if (storyError || !activeStory) {
      return NextResponse.json({ error: 'No active story found' }, { status: 404 })
    }

    // Get expired submissions with highest votes
    const { data: expiredSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('story_id', activeStory.id)
      .lt('round_end', new Date().toISOString())
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)

    if (submissionsError) {
      return NextResponse.json({ error: 'Error fetching submissions' }, { status: 500 })
    }

    if (expiredSubmissions.length === 0) {
      // No submissions, trigger AI generation
      const baseUrl = req.nextUrl.origin
      await fetch(`${baseUrl}/api/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return NextResponse.json({ message: 'No expired submissions, triggered AI generation' })
    }

    const winningSubmission = expiredSubmissions[0]

    // Add winning sentence to story
    const newContent = `${activeStory.content} ${winningSubmission.content}`

    // Check if story is getting too long (close to 1000 chars)
    if (newContent.length >= 1000) {
      // Create new story
      await supabase
        .from('stories')
        .update({ is_active: false })
        .eq('id', activeStory.id)

      // Trigger AI to generate new story
      const baseUrl = req.nextUrl.origin
      await fetch(`${baseUrl}/api/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } else {
      // Update current story
      await supabase
        .from('stories')
        .update({ content: newContent })
        .eq('id', activeStory.id)
    }

    // Delete all submissions for this round
    await supabase
      .from('submissions')
      .delete()
      .eq('story_id', activeStory.id)
      .lt('round_end', new Date().toISOString())

    // Delete associated votes
    await supabase
      .from('votes')
      .delete()
      .in('submission_id', expiredSubmissions.map(s => s.id))

    return NextResponse.json({ 
      success: true, 
      winner: winningSubmission.content,
      votes: winningSubmission.votes
    })
  } catch (error) {
    console.error('Settle API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}