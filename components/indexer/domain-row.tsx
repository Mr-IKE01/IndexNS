'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { CountdownTimer } from './countdown-timer'
import { formatExpiryDate, formatExpiryDateShort, formatTimeRemaining } from '@/lib/sui/time'
import { GRACE_PERIOD_MS } from '@/lib/sui/constants'
import type { SuinsDomain, LabelType } from '@/types/domain'

const SUISCAN_BASE = 'https://suiscan.xyz/mainnet/object'

interface DomainRowProps {
  domain: SuinsDomain
}

const LABEL_TYPE_CONFIG: Record<LabelType, { label: string; style: React.CSSProperties }> = {
  numeric: {
    label: '123',
    style: { background: 'oklch(0.55 0.18 255 / 0.15)', color: 'oklch(0.75 0.18 255)', border: '1px solid oklch(0.55 0.18 255 / 0.3)' },
  },
  alpha: {
    label: 'ABC',
    style: { background: 'oklch(0.55 0.10 285 / 0.15)', color: 'oklch(0.72 0.10 285)', border: '1px solid oklch(0.55 0.10 285 / 0.3)' },
  },
  mixed: {
    label: 'A1B',
    style: { background: 'oklch(0.65 0.18 195 / 0.15)', color: 'oklch(0.72 0.18 195)', border: '1px solid oklch(0.65 0.18 195 / 0.3)' },
  },
  emoji: {
    label: '😀',
    style: { background: 'oklch(0.65 0.20 55 / 0.15)', color: 'oklch(0.80 0.15 55)', border: '1px solid oklch(0.65 0.20 55 / 0.3)' },
  },
}

function LabelTypeBadge({ type }: { type: LabelType }) {
  const config = LABEL_TYPE_CONFIG[type]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0"
      style={config.style}
      title={`Label type: ${type}`}
    >
      {config.label}
    </span>
  )
}

function UrgencyBar({ targetMs }: { targetMs: number }) {
  const remaining = targetMs - Date.now()
  const pct = Math.max(0, Math.min(100, (remaining / GRACE_PERIOD_MS) * 100))
  const color = pct > 60 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'

  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'oklch(0.22 0.05 285)' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: 'none' }}
      />
    </div>
  )
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
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
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <button
      onClick={handleCopy}
      title={label ? `Copy ${label}` : 'Copy'}
      className="inline-flex items-center justify-center w-5 h-5 rounded transition-all shrink-0"
      style={{ color: copied ? '#2dd4bf' : 'oklch(0.45 0.05 285)' }}
    >
      {copied
        ? <Check className="w-3 h-3" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function DomainRow({ domain }: DomainRowProps) {
  const {
    name,
    nft_id,
    owner_address,
    label_type,
    expiry_timestamp_ms,
    grace_period_end_ms,
    domain_status,
  } = domain

  const suiScanUrl = nft_id ? `${SUISCAN_BASE}/${nft_id}` : null

  const countdownTarget =
    domain_status === 'grace' ? grace_period_end_ms : expiry_timestamp_ms
  const countdownVariant = domain_status === 'grace' ? 'grace' : 'expiry'

  const expiryDisplay = formatExpiryDate(expiry_timestamp_ms)
  const graceDisplay = formatExpiryDate(grace_period_end_ms)
  const shortDate = domain_status === 'grace'
    ? formatExpiryDateShort(grace_period_end_ms)
    : formatExpiryDateShort(expiry_timestamp_ms)

  const droppedAgo = domain_status === 'expired'
    ? formatTimeRemaining(grace_period_end_ms)
    : null

  const rowStyle: React.CSSProperties = {
    borderBottom: '1px solid oklch(0.22 0.05 285)',
  }

  return (
    <>
      {/* ── DESKTOP (md+) ─────────────────────────────────────────── */}
      <div
        className="hidden md:grid items-start px-4 py-3 gap-3 group hover:bg-white/[0.02] transition-colors"
        style={{
          ...rowStyle,
          gridTemplateColumns: '1fr 160px 130px 200px',
        }}
      >
        {/* Col 1 — Name */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-mono text-sm font-semibold truncate"
              style={{ color: '#f1f5f9' }}
            >
              {name}
            </span>
            <LabelTypeBadge type={label_type} />
            <CopyButton value={name} label="domain name" />
            {suiScanUrl && (
              
                href={suiScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on SuiScan"
                className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors shrink-0"
                style={{ color: 'oklch(0.45 0.05 285)' }}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {owner_address && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono" style={{ color: 'oklch(0.45 0.05 285)' }}>
                {truncateAddress(owner_address)}
              </span>
              <CopyButton value={owner_address} label="owner address" />
            </div>
          )}
        </div>

        {/* Col 2 — Countdown */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}
          {domain_status === 'expired' ? (
            <span className="text-xs font-mono" style={{ color: 'oklch(0.45 0.05 285)' }}>
              {droppedAgo}
            </span>
          ) : (
            <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
          )}
        </div>

        {/* Col 3 — Short date */}
        <div className="flex flex-col gap-0.5 pt-0.5 text-right">
          <span className="text-xs font-mono" style={{ color: 'oklch(0.55 0.05 285)' }}>
            {shortDate}
          </span>
          {domain_status === 'grace' && (
            <span className="text-[10px]" style={{ color: '#f59e0b' }}>grace ends</span>
          )}
          {domain_status === 'expired' && (
            <span className="text-[10px]" style={{ color: '#22c55e' }}>available</span>
          )}
        </div>

        {/* Col 4 — Exact timestamps */}
        <div className="flex flex-col gap-1 pt-0.5 items-end">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] select-all" style={{ color: 'oklch(0.60 0.05 285)' }}>
              {expiryDisplay}
            </span>
            <CopyButton value={expiryDisplay} label="expiry timestamp" />
          </div>
          {domain_status !== 'expired' && (
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] select-all" style={{ color: 'oklch(0.45 0.05 285)' }}>
                {graceDisplay}
              </span>
              <CopyButton value={graceDisplay} label="grace end timestamp" />
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE card ───────────────────────────────────────────── */}
      <div
        className="md:hidden mx-3 mb-2 rounded-xl p-3.5 space-y-2.5"
        style={{
          background: 'oklch(0.17 0.04 285)',
          border: '1px solid oklch(0.25 0.07 285)',
        }}
      >
        {/* Name row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-sm font-semibold flex-1 truncate" style={{ color: '#f1f5f9' }}>
            {name}
          </span>
          <LabelTypeBadge type={label_type} />
          <CopyButton value={name} label="domain name" />
          {suiScanUrl && (
            
              href={suiScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-5 h-5 rounded"
              style={{ color: 'oklch(0.45 0.05 285)' }}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Owner */}
        {owner_address && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono" style={{ color: 'oklch(0.45 0.05 285)' }}>
              {truncateAddress(owner_address)}
            </span>
            <CopyButton value={owner_address} label="owner" />
          </div>
        )}

        {/* Urgency bar */}
        {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}

        {/* Countdown / dropped */}
        {domain_status === 'expired' ? (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'oklch(0.50 0.05 285)' }}>
              Dropped {droppedAgo}
            </span>
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Available</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
            <span className="text-xs font-mono" style={{ color: 'oklch(0.50 0.05 285)' }}>
              {shortDate}
            </span>
          </div>
        )}

        {/* Timestamps with copy */}
        <div
          className="rounded-lg px-2.5 py-2 space-y-1.5"
          style={{ background: 'oklch(0.13 0.04 285)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider w-12 shrink-0" style={{ color: 'oklch(0.42 0.05 285)' }}>
              Expiry
            </span>
            <span className="font-mono text-[10px] select-all flex-1" style={{ color: 'oklch(0.60 0.05 285)' }}>
              {expiryDisplay}
            </span>
            <CopyButton value={expiryDisplay} label="expiry" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider w-12 shrink-0" style={{ color: 'oklch(0.42 0.05 285)' }}>
              Grace
            </span>
            <span className="font-mono text-[10px] select-all flex-1" style={{ color: 'oklch(0.50 0.05 285)' }}>
              {graceDisplay}
            </span>
            <CopyButton value={graceDisplay} label="grace end" />
          </div>
        </div>

        {domain_status === 'grace' && (
          <div className="text-[10px] text-center" style={{ color: '#f59e0b' }}>
            ⏳ Grace period — original owner can still renew
          </div>
        )}
      </div>
    </>
  )
}
