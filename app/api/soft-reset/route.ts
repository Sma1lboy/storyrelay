import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('=== Soft Reset started at:', new Date().toISOString(), '===')
    
    // Step 1: Get current active story
    const { data: activeStory, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('is_active', true)
      .single()

    if (storyError && storyError.code !== 'PGRST116') {
      console.error('Error fetching active story:', storyError)
      return NextResponse.json({ error: 'Error fetching active story' }, { status: 500 })
    }

    let deactivatedStoryId = null
    if (activeStory) {
      console.log('Found active story:', activeStory.id, 'length:', activeStory.content.length)
      
      // Step 2: Mark current active story as inactive
      const { error: deactivateError } = await supabase
        .from('stories')
        .update({ is_active: false })
        .eq('id', activeStory.id)

      if (deactivateError) {
        console.error('Error deactivating story:', deactivateError)
        return NextResponse.json({ error: 'Failed to deactivate current story' }, { status: 500 })
      }

      deactivatedStoryId = activeStory.id
      console.log('Deactivated story:', activeStory.id)
    } else {
      console.log('No active story found')
    }

    // Step 3: Get all submissions for the deactivated story
    const { data: allSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id')
      .eq('story_id', deactivatedStoryId || '')

    const submissionCount = allSubmissions?.length || 0
    console.log(`Found ${submissionCount} submissions to clean up`)

    // Step 4: Delete all votes for these submissions
    if (submissionCount > 0) {
      const submissionIds = allSubmissions.map(s => s.id)
      
      const { error: deleteVotesError } = await supabase
        .from('votes')
        .delete()
        .in('submission_id', submissionIds)

      if (deleteVotesError) {
        console.error('Error deleting votes:', deleteVotesError)
      } else {
        console.log('Deleted all votes for submissions')
      }

      // Step 5: Delete all submissions for the deactivated story
      const { error: deleteSubmissionsError } = await supabase
        .from('submissions')
        .delete()
        .eq('story_id', deactivatedStoryId)

      if (deleteSubmissionsError) {
        console.error('Error deleting submissions:', deleteSubmissionsError)
        return NextResponse.json({ error: 'Failed to delete submissions' }, { status: 500 })
      }

      console.log(`Deleted ${submissionCount} submissions`)
    }

    // Step 6: Generate a new story
    console.log('Triggering new story generation...')
    const baseUrl = req.nextUrl.origin
    const generateResponse = await fetch(`${baseUrl}/api/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    let newStoryResult = null
    if (generateResponse.ok) {
      newStoryResult = await generateResponse.json()
      console.log('New story generation result:', newStoryResult)
    } else {
      console.error('Failed to generate new story:', generateResponse.status)
      return NextResponse.json({ error: 'Failed to generate new story' }, { status: 500 })
    }

    console.log('=== Soft Reset completed successfully ===')

    return NextResponse.json({ 
      success: true, 
      message: `Soft reset completed! Deactivated story, deleted ${submissionCount} submissions, and generated new story.`,
      details: {
        deactivatedStoryId,
        deletedSubmissions: submissionCount,
        newStoryGenerated: newStoryResult?.success || false
      }
    })
  } catch (error) {
    console.error('Soft reset API error:', error)
    return NextResponse.json({ error: 'Server error during soft reset' }, { status: 500 })
  }
}