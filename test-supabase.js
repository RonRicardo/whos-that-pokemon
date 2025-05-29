// test-supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

// Test connection
async function testConnection() {
  try {
    console.log('Testing connection...')
    
    // Try to fetch from players table
    const { data, error, count } = await supabase
      .from('players')
      .select('*', { count: 'exact' })
    
    if (error) {
      console.error('Error:', error)
    } else {
      console.log('✅ Connection successful!')
      console.log('Players in database:', count)
      console.log('Sample data:', data?.slice(0, 2))
    }
  } catch (err) {
    console.error('❌ Connection failed:', err)
  }
}

testConnection()