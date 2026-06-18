'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
      setError(data.error ?? 'Invalid access token.')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'oklch(0.13 0.04 285)' }}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #818cf8 0%, #2dd4bf 50%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #a78bfa 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-sm space-y-8 z-10">

        {/* Logo mark */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto relative"
            style={{ background: 'oklch(0.17 0.06 285)', border: '1px solid oklch(0.30 0.10 285)' }}
          >
            <span className="text-3xl font-black tracking-tighter"
              style={{
                background: 'linear-gradient(135deg, #2dd4bf, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              .NS
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SuiNS Indexer
            </h1>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.55 0.06 285)' }}>
              Private access — invite only
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5 relative overflow-hidden"
          style={{
            background: 'oklch(0.17 0.04 285)',
            border: '1px solid oklch(0.28 0.08 285)',
            boxShadow: '0 0 0 1px oklch(0.30 0.10 195 / 0.3), 0 20px 40px -12px oklch(0.08 0.04 285)',
          }}
        >
          {/* Subtle gradient top stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #2dd4bf55, #818cf855, transparent)' }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium text-white/80">
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
                className="h-10 font-mono text-sm text-white placeholder:text-white/20"
                style={{
                  background: 'oklch(0.13 0.04 285)',
                  borderColor: 'oklch(0.28 0.08 285)',
                }}
              />
            </div>

            {error && (
              <div
                className="text-sm px-3 py-2.5 rounded-lg"
                style={{
                  background: 'oklch(0.60 0.22 25 / 0.12)',
                  border: '1px solid oklch(0.60 0.22 25 / 0.3)',
                  color: 'oklch(0.75 0.18 25)',
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full h-10 font-semibold text-sm"
              style={{
                background: loading || !token.trim()
                  ? 'oklch(0.22 0.06 285)'
                  : 'linear-gradient(135deg, #2dd4bf, #818cf8)',
                color: loading || !token.trim() ? 'oklch(0.45 0.04 285)' : '#0d1117',
                border: 'none',
              }}
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
        </div>

        <p className="text-center text-xs" style={{ color: 'oklch(0.40 0.04 285)' }}>
          Contact the admin if you need access
        </p>
      </div>
    </main>
  )
}
