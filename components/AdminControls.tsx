'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Bot, Plus } from "lucide-react"

export default function AdminControls() {
  const [generating, setGenerating] = useState(false)
  const [settling, setSettling] = useState(false)
  const [generatingNew, setGeneratingNew] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  // Don't render in production
  if (!isDev) {
    return null
  }

  const handleGenerateStory = async () => {
    console.log('Generate story clicked')
    setGenerating(true)
    try {
      console.log('Calling /api/generate-story')
      const response = await fetch('/api/generate-story', {
        method: 'POST',
      })
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Response data:', result)
      
      if (result.success) {
        alert('AI story generated successfully!')
        window.location.reload()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Generate story error:', error)
      alert('Failed to generate story: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateNewStory = async () => {
    console.log('Generate new story clicked')
    setGeneratingNew(true)
    try {
      console.log('Calling /api/generate-new-story')
      const response = await fetch('/api/generate-new-story', {
        method: 'POST',
      })
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Response data:', result)
      
      if (result.success) {
        alert('New story generated successfully!')
        window.location.reload()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Generate new story error:', error)
      alert('Failed to generate new story: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setGeneratingNew(false)
    }
  }

  const handleSettle = async () => {
    console.log('Settle clicked')
    setSettling(true)
    try {
      console.log('Calling /api/settle')
      const response = await fetch('/api/settle', {
        method: 'POST',
      })
      console.log('Settle response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Settle response data:', result)
      
      if (result.success) {
        alert('Settlement completed!')
        window.location.reload()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Settle error:', error)
      alert('Failed to settle: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSettling(false)
    }
  }

  return (
    <Card className="card-elevated mt-6">
      <CardHeader>
        <CardTitle className="text-title-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Admin Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleGenerateStory}
            disabled={generating}
            variant="outline"
            className="transition-smooth"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Story
              </>
            )}
          </Button>

          {isDev && (
            <Button
              onClick={handleGenerateNewStory}
              disabled={generatingNew}
              variant="outline"
              className="transition-smooth"
            >
              {generatingNew ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                  Creating New...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Story
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSettle}
            disabled={settling}
            variant="outline"
            className="transition-smooth"
          >
            {settling ? (
              <>
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Settling...
              </>
            ) : (
              <>
                Settle Votes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}