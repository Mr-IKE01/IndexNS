'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { formatExpiryDate, formatExpiryDateShort, formatTimeRemaining } from '@/lib/sui/time'
import { GRACE_PERIOD_MS } from '@/lib/sui/constants'
import type { SuinsDomain, LabelType } from '@/types/domain'

const SUISCAN_BASE = 'https://suiscan.xyz/mainnet/object'

interface DomainRowProps {
  domain: SuinsDomain
  index:  number
}

const LABEL_DISPLAY: Record<LabelType, string> = {
  numeric: '123',
  alpha:   'abc',
  mixed:   'a1b',
  emoji:   '😀',
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`
}

function timerColor(ms: number, variant: 'expiry' | 'grace'): string {
  if (variant === 'grace') return ms < 86_400_000 ? '#f87171' : '#fbbf24'
  if (ms <= 0)                  return '#52525b'
  if (ms < 86_400_000)          return '#f87171'
  if (ms < 7 * 86_400_000)      return '#fbbf24'
  if (ms < 30 * 86_400_000)     return '#e4e4e7'
  return '#71717a'
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1300)
  }, [value])

  return (
    <button
      onClick={handle}
      title={label ? `Copy ${label}` : 'Copy'}
      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors"
      style={{ color: copied ? '#2dd4bf' : 'rgba(255,255,255,0.2)' }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#2dd4bf' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
    >
      {copied
        ? <Check className="h-[11px] w-[11px]" />
        : <Copy  className="h-[11px] w-[11px]" />
      }
    </button>
  )
}

function truncateAddr(a: string) {
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function DomainRow({ domain, index }: DomainRowProps) {
  const {
    name,
    nft_id,
    owner_address,
    label_type,
    expiry_timestamp_ms,
    grace_period_end_ms,
    domain_status,
  } = domain

  const isExpired      = domain_status === 'expired'
  const isGrace        = domain_status === 'grace'
  const countdownMs    = isGrace ? grace_period_end_ms : expiry_timestamp_ms
  const timerVariant   = isGrace ? 'grace' : 'expiry'
  const suiScanUrl     = nft_id ? `${SUISCAN_BASE}/${nft_id}` : null
  const expiryDisplay  = formatExpiryDate(expiry_timestamp_ms)
  const graceDisplay   = formatExpiryDate(grace_period_end_ms)
  const shortDate      = isGrace
    ? formatExpiryDateShort(grace_period_end_ms)
    : formatExpiryDateShort(expiry_timestamp_ms)
  const droppedAgo     = isExpired ? formatTimeRemaining(grace_period_end_ms) : null

  // Single countdown state drives both bar and timer text
  const [remaining, setRemaining] = useState(() =>
    isExpired ? 0 : countdownMs - Date.now(),
  )

  useEffect(() => {
    if (isExpired) return
    const tick = () => setRemaining(countdownMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [countdownMs, isExpired])

  const pct      = Math.max(0, Math.min(100, (remaining / GRACE_PERIOD_MS) * 100))
  const barColor = pct > 60 ? '#34d399' : pct > 20 ? '#fbbf24' : '#f87171'
  const color    = timerColor(remaining, timerVariant)
  const rowNum   = String(index).padStart(2, '0')

  return (
    <div
      className="group mb-1.5 rounded-xl transition-all duration-150"
      style={{ background: '#151228', border: '1px solid #2d2552' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#4a3f7e'
        ;(e.currentTarget as HTMLElement).style.background = '#1a163a'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#2d2552'
        ;(e.currentTarget as HTMLElement).style.background = '#151228'
      }}
    >
      <div className="flex gap-3 px-4 py-3.5">

        {/* Row number */}
        <div className="w-[20px] shrink-0 pt-0.5 text-right">
          <span className="select-none font-mono text-[10px]" style={{ color: '#3d3a52' }}>
            {rowNum}
          </span>
        </div>

        {/* All content */}
        <div className="min-w-0 flex-1 space-y-2.5">

          {/* ── Name row ── */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[14px] font-semibold text-zinc-100 truncate">
              {name}
            </span>

            {/* Type badge */}
            <span
              className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#52525b' }}
            >
              {LABEL_DISPLAY[label_type]}
            </span>

            <CopyButton value={name} label="domain name" />

            {suiScanUrl && (
              <a
                href={suiScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on SuiScan"
                className="inline-flex h-[18px] w-[18px] items-center justify-center rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2dd4bf')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
              >
                <ExternalLink className="h-[11px] w-[11px]" />
              </a>
            )}

            {owner_address && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[11px]" style={{ color: '#3f3f46' }}>·</span>
                <span className="font-mono text-[11px]" style={{ color: '#52525b' }}>
                  {truncateAddr(owner_address)}
                </span>
                <CopyButton value={owner_address} label="owner address" />
              </div>
            )}
          </div>

          {/* ── Timer + dates row ── */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">

            {/* Left: urgency bar + countdown */}
            <div className="flex min-w-[160px] flex-col gap-1.5">
              {!isExpired && (
                <div
                  className="h-[3px] w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              )}

              {isExpired ? (
                <span className="font-mono text-[12px]" style={{ color: '#52525b' }}>
                  {droppedAgo}
                </span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-mono text-[13px] tabular-nums${remaining > 0 && remaining < 86_400_000 ? ' animate-pulse' : ''}`}
                    style={{ color }}
                  >
                    {formatCountdown(remaining)}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: '#3d3a52' }}>
                    {shortDate}
                  </span>
                </div>
              )}
            </div>

            {/* Right: exact timestamps */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3d3a52' }}>
                  Exp
                </span>
                <span className="select-all font-mono text-[11px]" style={{ color: '#71717a' }}>
                  {expiryDisplay}
                </span>
                <CopyButton value={expiryDisplay} label="expiry timestamp" />
              </div>

              {!isExpired && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3d3a52' }}>
                    Grace
                  </span>
                  <span className="select-all font-mono text-[11px]" style={{ color: '#52525b' }}>
                    {graceDisplay}
                  </span>
                  <CopyButton value={graceDisplay} label="grace end timestamp" />
                </div>
              )}

              {isExpired && (
                <span className="text-[11px] font-semibold" style={{ color: '#34d399' }}>
                  Available now
                </span>
              )}
            </div>
          </div>

          {/* Grace notice */}
          {isGrace && (
            <p className="text-[10px]" style={{ color: 'rgba(251,191,36,0.6)' }}>
              Grace period · original owner can still renew
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
