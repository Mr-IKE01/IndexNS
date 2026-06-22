'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetMs:   number
  variant?:   'expiry' | 'grace'
  className?: string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const d   = Math.floor(totalSec / 86400)
  const h   = Math.floor((totalSec % 86400) / 3600)
  const m   = Math.floor((totalSec % 3600) / 60)
  const s   = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`
}

function getColor(ms: number, variant: 'expiry' | 'grace'): string {
  if (variant === 'grace') {
    if (ms < 86_400_000)     return '#f87171'  // red    < 1 day
    if (ms < 3 * 86_400_000) return '#fb923c'  // orange < 3 days
    return '#fbbf24'                            // amber  rest of grace
  }
  if (ms <= 0)               return '#52525b'  // zinc   expired
  if (ms < 86_400_000)       return '#f87171'  // red    < 1 day
  if (ms < 7 * 86_400_000)   return '#fb923c'  // orange < 7 days
  if (ms < 30 * 86_400_000)  return '#fbbf24'  // yellow < 30 days
  if (ms < 90 * 86_400_000)  return '#a3e635'  // lime   < 90 days
  return '#34d399'                              // emerald > 90 days
}

export function CountdownTimer({
  targetMs,
  variant   = 'expiry',
  className = '',
}: CountdownTimerProps) {
  // Original working pattern — initialize directly, no null placeholder
  const [remaining, setRemaining] = useState(() => Number(targetMs) - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(Number(targetMs) - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  const color  = getColor(remaining, variant)
  const urgent = remaining > 0 && remaining < 86_400_000

  return (
    <span
      suppressHydrationWarning
      className={`font-mono text-[13px] tabular-nums${urgent ? ' animate-pulse' : ''}${className ? ` ${className}` : ''}`}
      style={{ color }}
    >
      {formatCountdown(remaining)}
    </span>
  )
}
