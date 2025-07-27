import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
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
      return NextResponse.json({ message: 'No expired submissions to settle' })
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

      await supabase
        .from('stories')
        .insert({
          content: 'Once upon a time, there was a mysterious city...',
          is_active: true
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