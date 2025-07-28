import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await req.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
    }

    // First, get the submission to find the story and check round
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, story_id, round_end')
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
    }

    // Check if round is still active
    if (new Date(submission.round_end) <= new Date()) {
      return NextResponse.json({ error: 'Voting has ended' }, { status: 400 })
    }

    // Get all current active submissions for this story
    const { data: activeSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('story_id', submission.story_id)
      .gt('round_end', new Date().toISOString())

    if (!activeSubmissions || activeSubmissions.length === 0) {
      return NextResponse.json({ error: 'No active voting round' }, { status: 400 })
    }

    const activeSubmissionIds = activeSubmissions.map(s => s.id)

    // Check if user already voted in this active round
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .in('submission_id', activeSubmissionIds)
      .single()

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted in this round' }, { status: 400 })
    }


    // Insert vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        submission_id,
        user_id: userId,
      })

    if (voteError) {
      console.error('Vote insert error:', voteError)
      return NextResponse.json({ error: 'Voting failed' }, { status: 500 })
    }

    // Update vote count by counting all votes for this submission
    const { data: voteCount } = await supabase
      .from('votes')
      .select('id')
      .eq('submission_id', submission_id)

    const { error: updateError } = await supabase
      .from('submissions')
      .update({ votes: voteCount?.length || 0 })
      .eq('id', submission_id)

    if (updateError) {
      console.error('Vote count update error:', updateError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}