'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetMs: number
  variant?: 'expiry' | 'grace'
  className?: string
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00:00:00'
  const totalSec = Math.floor(remainingMs / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d)}:${p(h)}:${p(m)}:${p(s)}`
}

function getColorClass(remainingMs: number, variant: 'expiry' | 'grace'): string {
  if (variant === 'grace') {
    if (remainingMs < 86_400_000) return 'text-red-400'
    return 'text-amber-400'
  }
  if (remainingMs <= 0) return 'text-zinc-500'
  if (remainingMs < 86_400_000) return 'text-red-400'
  if (remainingMs < 7 * 86_400_000) return 'text-yellow-400'
  if (remainingMs < 30 * 86_400_000) return 'text-zinc-100'
  return 'text-zinc-400'
}

export function CountdownTimer({
  targetMs,
  variant = 'expiry',
  className = '',
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => targetMs - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(targetMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  const colorClass = getColorClass(remaining, variant)
  const urgent = remaining > 0 && remaining < 86_400_000

  return (
    <span className={`font-mono text-[13px] tabular-nums ${colorClass} ${urgent ? 'animate-pulse' : ''} ${className}`}>
      {formatCountdown(remaining)}
    </span>
  )
}
