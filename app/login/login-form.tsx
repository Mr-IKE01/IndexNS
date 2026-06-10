'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginForm() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
        return
      }

      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Invalid access token. Try again.')
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto">
            <KeyRound className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              SuiNS Indexer
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Private access — invite only
            </p>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="token"
              className="text-sm font-medium text-zinc-300"
            >
              Access token
            </label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="tok_••••••••••••••••"
              autoComplete="current-password"
              autoFocus
              disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Authenticating…
              </span>
            ) : (
              'Access Indexer'
            )}
          </Button>
        </form>

        <p className="text-center text-zinc-700 text-xs">
          Contact the admin if you need access.
        </p>
      </div>
    </main>
  )
                              }
