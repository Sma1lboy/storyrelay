import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Story = {
  id: string
  content: string
  created_at: string
  is_active: boolean
}

export type Submission = {
  id: string
  story_id: string
  content: string
  user_id: string
  user_name: string
  votes: number
  created_at: string
  round_end: string
}

export type Vote = {
  id: string
  submission_id: string
  user_id: string
  created_at: string
}