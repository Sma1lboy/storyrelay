import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('is_active', true)
      .single()

    if (storyError || !activeStory) {
      return NextResponse.json({ error: 'No active story found' }, { status: 404 })
    }

    const currentTime = new Date().toISOString()
    console.log('Current time:', currentTime)

    // Get current active submissions (round_end in the future)
    const { data: activeSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('story_id', activeStory.id)
      .gt('round_end', currentTime)

    console.log('Found active submissions:', activeSubmissions?.length || 0)
    if (activeSubmissions) {
      activeSubmissions.forEach(sub => {
        console.log(`  - "${sub.content}" (round_end: ${sub.round_end})`)
      })
    }

    if (submissionsError) {
      console.error('Error fetching active submissions:', submissionsError)
      return NextResponse.json({ error: 'Error fetching submissions' }, { status: 500 })
    }

    if (!activeSubmissions || activeSubmissions.length === 0) {
      console.log('No active submissions found to force end')
      return NextResponse.json({ 
        success: true,
        message: 'No active round to end' 
      })
    }

    // Force end current round by setting round_end to current time
    console.log(`Force ending ${activeSubmissions.length} active submissions`)
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ round_end: currentTime })
      .eq('story_id', activeStory.id)
      .gt('round_end', currentTime)

    if (updateError) {
      console.error('Force end round error:', updateError)
      return NextResponse.json({ error: 'Failed to end round' }, { status: 500 })
    }

    console.log(`Force ended round: ${activeSubmissions.length} submissions expired`)

    // Wait a moment to ensure the database update is completed
    await new Promise(resolve => setTimeout(resolve, 100))

    // Automatically trigger settlement
    const baseUrl = req.nextUrl.origin
    console.log(`Triggering settlement at: ${baseUrl}/api/settle`)
    
    const settleResponse = await fetch(`${baseUrl}/api/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    let settleResult = null
    if (settleResponse.ok) {
      settleResult = await settleResponse.json()
      console.log('Settlement result:', settleResult)
    } else {
      console.error('Settlement failed:', settleResponse.status, await settleResponse.text())
      settleResult = { error: 'Settlement failed' }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Round ended forcefully. ${activeSubmissions.length} submissions expired.`,
      endedSubmissions: activeSubmissions.length,
      settlementResult: settleResult
    })
  } catch (error) {
    console.error('Force end round API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}