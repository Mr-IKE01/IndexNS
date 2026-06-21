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

  const isDisabled = loading || !token.trim()

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#0d0a17' }}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-60 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(129,140,248,0.35) 0%, rgba(45,212,191,0.2) 50%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[350px] h-[350px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-md z-10">

        {/* Logo + heading */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 40px rgba(45,212,191,0.15)',
            }}
          >
            <span
              className="text-4xl font-black tracking-tighter relative z-10 select-none"
              style={{
                background: 'linear-gradient(135deg, #2dd4bf 0%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              .NS
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SuiNS Indexer</h1>
          <p className="mt-2 text-sm text-zinc-500">Private access — invite only</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 0 0 1px rgba(130,100,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.6)',
          }}
        >
          {/* Top shimmer stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.5) 40%, rgba(129,140,248,0.5) 60%, transparent 100%)',
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Token input */}
            <div className="space-y-2">
              <label
                htmlFor="token"
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                Access token
              </label>

              <div className="relative">
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="tok_••••••••••••••••"
                  autoComplete="current-password"
                  autoFocus
                  disabled={loading}
                  className="w-full h-11 rounded-xl px-4 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e4e4e7',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(45,212,191,0.55)'
                    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(45,212,191,0.10)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.boxShadow   = 'none'
                  }}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                }}
              >
                <span className="mt-px shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-11 rounded-xl text-[14px] font-semibold tracking-tight flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: isDisabled
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #2dd4bf 0%, #818cf8 100%)',
                color: isDisabled ? 'rgba(255,255,255,0.25)' : '#0d1117',
                border: isDisabled ? '1px solid rgba(255,255,255,0.08)' : 'none',
                boxShadow: isDisabled ? 'none' : '0 0 24px rgba(45,212,191,0.25)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Access Indexer'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-700 mt-6">
          Contact the admin if you need access
        </p>
      </div>
    </main>
  )
}
