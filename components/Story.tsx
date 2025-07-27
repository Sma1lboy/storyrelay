'use client'

import { useEffect, useState } from 'react'
import { supabase, type Story } from '@/lib/supabase'

export default function StoryComponent() {
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActiveStory() {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching story:', error)
      } else {
        setStory(data)
      }
      setLoading(false)
    }

    fetchActiveStory()

    // Subscribe to story updates
    const channel = supabase
      .channel('story-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'stories' },
        (payload) => {
          if (payload.new.is_active) {
            setStory(payload.new as Story)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="text-gray-500">No active story available</p>
      </div>
    )
  }

  // Split content into sentences and highlight the last one
  const sentences = story.content.split('。').filter(s => s.trim())
  const lastSentence = sentences[sentences.length - 1]
  const otherSentences = sentences.slice(0, -1)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Current Story 📖</h2>
      <div className="text-lg leading-relaxed text-gray-700">
        {otherSentences.map((sentence, index) => (
          <span key={index}>{sentence}。</span>
        ))}
        {lastSentence && (
          <span className="bg-yellow-100 px-1 rounded">
            {lastSentence}。
          </span>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        Story length: {story.content.length}/1000 characters
      </div>
    </div>
  )
}