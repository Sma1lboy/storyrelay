import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

// Client-side Supabase client (anon key, subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (service role key, bypasses RLS)
// Only use this in API routes, never expose to the client
export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon key')
    return supabase
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

export type JudgeComment = {
  persona: string
  emoji: string
  comment: string
}

export type Story = {
  id: string
  content: string
  created_at: string
  updated_at: string
  is_active: boolean
  round_ids: string[]
  ai_comments: JudgeComment[] | null
}

export type Submission = {
  id: string
  story_id: string
  content: string
  user_id: string
  user_name: string
  created_at: string
  round_end: string
  round_id: string | null
  processed: boolean
  /** Computed vote count from the votes table (not stored on submissions) */
  vote_count: number
}

export type Vote = {
  id: string
  submission_id: string
  user_id: string
  created_at: string
}
