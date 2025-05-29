import { supabase } from '../lib/supabase'
import type { LeaderboardEntry, Player } from '../lib/supabase'

export interface SubmitScoreData {
  playerName: string
  score: number
  gameMode: 'classic' | 'modern'
  difficulty: 'easy' | 'normal'
  correctGuesses: number
  roundsCompleted?: number
  timeBonus?: number
}

export class LeaderboardService {
  // Submit a new score
  static async submitScore(data: SubmitScoreData): Promise<LeaderboardEntry | null> {
    try {
      // First, ensure player exists
      let player = await this.getOrCreatePlayer(data.playerName)
      
      // Insert the score
      const { data: scoreData, error } = await supabase
        .from('leaderboard')
        .insert({
          player_id: player.id,
          player_name: data.playerName,
          score: data.score,
          game_mode: data.gameMode,
          difficulty: data.difficulty,
          correct_guesses: data.correctGuesses,
          rounds_completed: data.roundsCompleted || 5,
          time_bonus: data.timeBonus || 0
        })
        .select()
        .single()

      if (error) throw error
      return scoreData
    } catch (error) {
      console.error('Error submitting score:', error)
      return null
    }
  }

  // Get leaderboard with filters
  static async getLeaderboard(options: {
    mode?: 'classic' | 'modern'
    difficulty?: 'easy' | 'normal'
    limit?: number
  } = {}): Promise<LeaderboardEntry[]> {
    try {
      let query = supabase
        .from('leaderboard')
        .select('*')

      if (options.mode) {
        query = query.eq('game_mode', options.mode)
      }
      
      if (options.difficulty) {
        query = query.eq('difficulty', options.difficulty)
      }

      const { data, error } = await query
        .order('score', { ascending: false })
        .limit(options.limit || 10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }
  }

  // Get player's rank and stats
  static async getPlayerRank(playerName: string): Promise<{
    rank: number | null
    totalPlayers: number
    playerStats: Player | null
  }> {
    try {
      // Get player stats
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('username', playerName)
        .single()

      if (!playerData) {
        return { rank: null, totalPlayers: 0, playerStats: null }
      }

      // Get player's best score rank
      const { data: rankData } = await supabase
        .rpc('get_player_global_rank', { player_name: playerName })

      // Get total players count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })

      return {
        rank: rankData || null,
        totalPlayers: count || 0,
        playerStats: playerData
      }
    } catch (error) {
      console.error('Error getting player rank:', error)
      return { rank: null, totalPlayers: 0, playerStats: null }
    }
  }

  // Helper: Get or create player
  private static async getOrCreatePlayer(username: string): Promise<Player> {
    // First try to get existing player
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('username', username)
      .single()

    if (existingPlayer) return existingPlayer

    // Create new player
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({ username })
      .select()
      .single()

    if (error) throw error
    return newPlayer
  }

  // Real-time leaderboard subscription
  static subscribeToLeaderboard(
    callback: (payload: any) => void,
    filters?: { mode?: string; difficulty?: string }
  ) {
    let channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leaderboard',
          filter: filters ? `game_mode=eq.${filters.mode}` : undefined
        },
        callback
      )

    return channel.subscribe()
  }
}