'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function SubmitForm() {
  const { user } = useUser()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      if (response.ok) {
        setContent('')
        // Show success message or refresh data
      } else {
        const error = await response.text()
        alert(`Submission failed: ${error}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Submission failed, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Write Next Sentence ✍️</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your story continuation here..."
            maxLength={50}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={submitting}
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {content.length}/50 characters
          </div>
        </div>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Story'}
        </button>
      </form>
    </div>
  )
}