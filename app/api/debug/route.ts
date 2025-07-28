import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Get all stories
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    // Get all submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })

    // Get all votes
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false })

    // Count active submissions
    const { data: activeSubmissions, error: activeError } = await supabase
      .from('submissions')
      .select('id')
      .gt('round_end', new Date().toISOString())

    // Count expired submissions
    const { data: expiredSubmissions, error: expiredError } = await supabase
      .from('submissions')
      .select('id')
      .lt('round_end', new Date().toISOString())

    if (storiesError || submissionsError || votesError) {
      return NextResponse.json({ error: 'Database query error' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      data: {
        stories: stories || [],
        submissions: submissions || [],
        votes: votes || [],
        activeSubmissions: activeSubmissions?.length || 0,
        expiredSubmissions: expiredSubmissions?.length || 0,
        currentTime: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}