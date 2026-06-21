'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'

export default function LoginForm() {
  const [token, setToken]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: token.trim() }),
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

  const canSubmit = !loading && token.trim().length > 0

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden"
      style={{ background: '#0d0a17' }}>

      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(129,140,248,0.3) 0%, rgba(45,212,191,0.15) 50%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.18) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 h-[300px] w-[300px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(ellipse, rgba(45,212,191,0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-6 inline-flex h-[72px] w-[72px] items-center justify-center rounded-2xl"
            style={{ background: '#151228', border: '1px solid #2d2552', boxShadow: '0 0 32px rgba(45,212,191,0.12)' }}>
            <span className="text-[32px] font-black tracking-tighter select-none"
              style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              .NS
            </span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">SuiNS Indexer</h1>
          <p className="mt-1.5 text-sm text-zinc-600">Private access · invite only</p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl p-8"
          style={{ background: '#151228', border: '1px solid #2d2552', boxShadow: '0 0 0 1px rgba(45,212,191,0.05), 0 24px 48px -12px rgba(0,0,0,0.7)' }}>

          {/* Top shimmer */}
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.45), rgba(129,140,248,0.45), transparent)' }} />

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-2">
              <label htmlFor="token" className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-400">
                <Lock className="h-3.5 w-3.5 text-zinc-600" />
                Access token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="tok_••••••••••••••••"
                autoComplete="current-password"
                autoFocus
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 font-mono text-[13px] text-zinc-100 placeholder:text-zinc-700 outline-none transition-all duration-200 disabled:opacity-50"
                style={{ background: '#0d0a17', border: '1px solid #2d2552' }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)'
                  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(45,212,191,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#2d2552'
                  e.currentTarget.style.boxShadow   = 'none'
                }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                <span className="mt-px shrink-0">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition-all duration-200"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #2dd4bf 0%, #818cf8 100%)'
                  : '#1e1a30',
                color:      canSubmit ? '#0d0a17' : '#3f3f46',
                border:     canSubmit ? 'none' : '1px solid #2d2552',
                boxShadow:  canSubmit ? '0 0 24px rgba(45,212,191,0.2)' : 'none',
                cursor:     canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Access Indexer'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-800">
          Contact the admin if you need access
        </p>
      </div>
    </main>
  )
}
