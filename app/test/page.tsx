'use client'

import { useState } from 'react'
import { testLeaderboardService } from '../services/leaderboardService'

export default function TestPage() {
  const [testResults, setTestResults] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    setTestResults('Running tests...\n')
    
    // Capture console.log output
    const originalLog = console.log
    let output = ''
    
    console.log = (...args) => {
      output += args.join(' ') + '\n'
      originalLog(...args)
    }
    
    try {
      await testLeaderboardService()
      setTestResults(output)
    } catch (error) {
      setTestResults(output + '\nError: ' + error)
    }
    
    // Restore console.log
    console.log = originalLog
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mb-6"
      >
        {loading ? 'Running Tests...' : 'Test Leaderboard Service'}
      </button>
      
      {testResults && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-bold mb-2">Test Results:</h2>
          <pre className="whitespace-pre-wrap text-sm">{testResults}</pre>
        </div>
      )}
    </div>
  )
}