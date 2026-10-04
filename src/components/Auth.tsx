import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // 1. Trigger this when a user clicks "Start Test Anonymously"
  const handleAnonymousLogin = async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) console.error("Anonymous login failed:", error)
    else console.log("Logged in anonymously!", data)
  }

  // 2. Trigger this when a user submits the "Create Account" form
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    const dummyEmail = `${username}@mocktest.local`
    
    const { data, error } = await supabase.auth.updateUser({
      email: dummyEmail,
      password: password,
      data: { display_name: username }
    })
    if (error) console.error("Account creation failed:", error)
    else console.log("Account upgraded!", data)
  }

  // 3. Trigger this for returning users logging in
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const dummyEmail = `${username}@mocktest.local`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: password,
    })
    if (error) console.error("Login failed:", error)
    else console.log("Logged in successfully!", data)
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto p-4">
      <button 
        onClick={handleAnonymousLogin}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
      >
        Start Test Anonymously
      </button>

      <div className="flex items-center my-2">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-3 text-gray-500 text-sm">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">
          Create Account & Save Progress
        </button>
        <button type="button" onClick={handleLogin} className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded">
          Login as Returning User
        </button>
      </form>
    </div>
  )
}