import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (generated from your schema)
export interface Player {
  id: string
  username: string
  created_at: string
  total_games: number
  best_score: number
  preferred_mode: 'classic' | 'modern'
  preferred_difficulty: 'easy' | 'normal'
}

export interface LeaderboardEntry {
  id: string
  player_id: string
  player_name: string
  score: number
  game_mode: 'classic' | 'modern'
  difficulty: 'easy' | 'normal'
  rounds_completed: number
  correct_guesses: number
  time_bonus: number
  created_at: string
  global_rank?: number
}