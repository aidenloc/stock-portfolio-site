'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Login failed')
    }
  }

  return (
    <main className="p-8 max-w-sm mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        className="border rounded px-3 py-2 text-black bg-white w-full mb-3"
      />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        Log In
      </button>
      {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
      <div className="mt-6 text-center">
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400">
          ← Back to site
        </a>
      </div>
    </main>
  )
}