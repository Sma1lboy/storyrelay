'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PenTool, Send, CheckCircle } from "lucide-react";

export default function SubmitForm() {
  const { user } = useUser()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
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

  const charactersRemaining = 50 - content.length
  const isNearLimit = charactersRemaining <= 10
  const isValid = content.trim().length > 0 && content.length <= 50

  return (
    <Card className="card-elevated">
      <CardHeader className="space-element">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <PenTool className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-title-4">Write Next Sentence</CardTitle>
              <CardDescription className="text-body-sm mt-1">
                Contribute to the story by adding the next sentence
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-caption">
            Max 50 chars
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-element">
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Continue the story with your creative sentence..."
              maxLength={50}
              rows={3}
              disabled={submitting}
              className={`resize-none focus-ring transition-smooth ${
                isNearLimit ? 'border-destructive/50 focus:border-destructive' : ''
              }`}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption">
                <div className={`w-2 h-2 rounded-full transition-smooth ${
                  isValid ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`} />
                <span className={`transition-smooth ${
                  isValid ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  {isValid ? 'Ready to submit' : 'Enter your sentence'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-caption font-medium transition-smooth ${
                  isNearLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {content.length}/50
                </span>
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-smooth ${
                      isNearLimit ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{ width: `${(content.length / 50) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between items-center pt-6 border-t border-border/50">
          {submitted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-body-sm font-medium">Submitted successfully!</span>
            </div>
          )}
          {!submitted && (
            <div className="text-caption text-muted-foreground">
              Your submission will be added to the voting pool
            </div>
          )}
          
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="transition-smooth"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}