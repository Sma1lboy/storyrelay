'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase, type Submission } from '@/lib/supabase'

export default function VoteList() {
  const { user } = useUser()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubmissions() {
      // Get active story first
      const { data: activeStory } = await supabase
        .from('stories')
        .select('id')
        .eq('is_active', true)
        .single()

      if (!activeStory) {
        setLoading(false)
        return
      }

      // Get current submissions for active story
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('story_id', activeStory.id)
        .gt('round_end', new Date().toISOString())
        .order('votes', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching submissions:', error)
      } else {
        setSubmissions(data || [])
      }
      setLoading(false)
    }

    async function checkUserVote() {
      if (!user) return

      const { data } = await supabase
        .from('votes')
        .select('submission_id')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setUserVote(data.submission_id)
      }
    }

    fetchSubmissions()
    checkUserVote()

    // Subscribe to submission updates
    const channel = supabase
      .channel('submission-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          fetchSubmissions()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => {
          fetchSubmissions()
          checkUserVote()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  const handleVote = async (submissionId: string) => {
    if (!user || userVote) return

    setVoting(submissionId)
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_id: submissionId,
        }),
      })

      if (response.ok) {
        setUserVote(submissionId)
      } else {
        const error = await response.text()
        alert(`Voting failed: ${error}`)
      }
    } catch (error) {
      console.error('Vote error:', error)
      alert('Voting failed, please try again')
    } finally {
      setVoting(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">🗳️ Vote for Next Sentence</h3>
        <p className="text-gray-500">No sentences available for voting</p>
      </div>
    )
  }

  // Calculate time remaining for current round
  const roundEnd = new Date(submissions[0]?.round_end || '')
  const now = new Date()
  const timeRemaining = Math.max(0, roundEnd.getTime() - now.getTime())
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60))

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">🗳️ Vote for Next Sentence</h3>
        <div className="text-sm text-gray-500">
          ⏰ {minutesRemaining > 0 ? `Settlement in ${minutesRemaining} minutes` : 'Settling soon'}
        </div>
      </div>
      
      {userVote && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-green-800 text-sm">✅ You have already voted</p>
        </div>
      )}

      <div className="space-y-3">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className={`border rounded-lg p-4 ${
              userVote === submission.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-gray-800 mb-2">{submission.content}</p>
                <p className="text-sm text-gray-500">by @{submission.user_name}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-blue-600">
                  {submission.votes} votes
                </span>
                {!userVote && (
                  <button
                    onClick={() => handleVote(submission.id)}
                    disabled={voting === submission.id}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {voting === submission.id ? 'Voting...' : 'Vote'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}