'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { CountdownTimer } from './countdown-timer'
import { formatExpiryDate, formatExpiryDateShort, formatTimeRemaining } from '@/lib/sui/time'
import { GRACE_PERIOD_MS } from '@/lib/sui/constants'
import type { SuinsDomain } from '@/types/domain'

const SUISCAN_BASE = 'https://suiscan.xyz/mainnet/object'

interface DomainRowProps {
  domain: SuinsDomain
}

// Draining urgency bar — shows how close domain is to expiry/grace-end
// Bar represents last 30 days before the critical timestamp
function UrgencyBar({
  targetMs,
}: {
  targetMs: number
  variant: 'expiry' | 'grace'
}) {
  const remaining = targetMs - Date.now()
  const pct = Math.max(0, Math.min(100, (remaining / GRACE_PERIOD_MS) * 100))

  const color =
    pct > 60 ? 'bg-emerald-500' :
    pct > 20 ? 'bg-yellow-500' :
    'bg-red-500'

  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-none`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Copy to clipboard button with check-mark feedback
function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [value])

  return (
    <button
      onClick={handleCopy}
      title={label ? `Copy ${label}` : 'Copy'}
      className="inline-flex items-center justify-center w-6 h-6 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  )
}

export function DomainRow({ domain }: DomainRowProps) {
  const {
    name,
    nft_id,
    expiry_timestamp_ms,
    grace_period_end_ms,
    domain_status,
  } = domain

  const suiScanUrl = nft_id ? `${SUISCAN_BASE}/${nft_id}` : null

  // Which timestamp to count down toward
  const countdownTarget =
    domain_status === 'grace' ? grace_period_end_ms : expiry_timestamp_ms
  const countdownVariant = domain_status === 'grace' ? 'grace' : 'expiry'

  // The "primary" UTC timestamp to display
  const primaryTs =
    domain_status === 'grace'
      ? formatExpiryDate(grace_period_end_ms)
      : formatExpiryDate(expiry_timestamp_ms)

  const shortDate =
    domain_status === 'grace'
      ? formatExpiryDateShort(grace_period_end_ms)
      : formatExpiryDateShort(expiry_timestamp_ms)

  // Label for expired rows
  const droppedAgo =
    domain_status === 'expired'
      ? formatTimeRemaining(grace_period_end_ms)
      : null

  return (
    <>
      {/* ── DESKTOP ROW (md and up) ────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[1fr_160px_140px_220px] gap-4 items-center px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-900/50 transition-colors group">

        {/* Col 1 — Name + actions */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm text-white font-medium truncate">
            {name}
          </span>
          <CopyButton value={name} label="domain name" />
          {suiScanUrl && (
            <a
              href={suiScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View on SuiScan"
              className="inline-flex items-center justify-center w-6 h-6 rounded text-zinc-600 hover:text-indigo-400 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Col 2 — Urgency bar + countdown */}
        <div className="flex flex-col gap-1.5">
          {domain_status !== 'expired' && (
            <UrgencyBar
              targetMs={countdownTarget}
              variant={countdownVariant}
            />
          )}
          {domain_status === 'expired' ? (
            <span className="text-zinc-500 text-xs">
              {droppedAgo}
            </span>
          ) : (
            <CountdownTimer
              targetMs={countdownTarget}
              variant={countdownVariant}
            />
          )}
        </div>

        {/* Col 3 — Short date */}
        <div className="text-right">
          <span className="text-zinc-500 text-xs font-mono">{shortDate}</span>
          {domain_status === 'grace' && (
            <div className="text-xs text-amber-500/70 mt-0.5">grace ends</div>
          )}
          {domain_status === 'expired' && (
            <div className="text-xs text-zinc-600 mt-0.5">available</div>
          )}
        </div>

        {/* Col 4 — Exact UTC timestamp + copy */}
        <div className="flex items-center gap-1.5 justify-end">
          <span className="font-mono text-xs text-zinc-400 select-all">
            {primaryTs}
          </span>
          <CopyButton value={primaryTs} label="timestamp" />
        </div>
      </div>

      {/* ── MOBILE CARD (below md) ─────────────────────────────────────── */}
      <div className="md:hidden mx-3 mb-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">

        {/* Top row — name + icons */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-white font-medium flex-1 truncate">
            {name}
          </span>
          <CopyButton value={name} label="domain name" />
          {suiScanUrl && (
            <a
              href={suiScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View on SuiScan"
              className="inline-flex items-center justify-center w-6 h-6 rounded text-zinc-600 hover:text-indigo-400 hover:bg-zinc-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Urgency bar */}
        {domain_status !== 'expired' && (
          <UrgencyBar targetMs={countdownTarget} variant={countdownVariant} />
        )}

        {/* Countdown or dropped-ago */}
        {domain_status === 'expired' ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Dropped {droppedAgo}</span>
            <span className="text-xs text-emerald-400 font-medium">Available</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <CountdownTimer
              targetMs={countdownTarget}
              variant={countdownVariant}
            />
            <span className="text-xs text-zinc-500 font-mono">{shortDate}</span>
          </div>
        )}

        {/* Exact UTC timestamp + copy */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 rounded-lg px-2.5 py-1.5">
          <span className="font-mono text-xs text-zinc-400 select-all flex-1">
            {primaryTs}
          </span>
          <CopyButton value={primaryTs} label="timestamp" />
        </div>

        {/* Grace period label */}
        {domain_status === 'grace' && (
          <div className="text-xs text-amber-500/80 text-center">
            ⏳ Grace period — original owner can still renew
          </div>
        )}
      </div>
    </>
  )
                }
