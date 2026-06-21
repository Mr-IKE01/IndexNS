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
  index:  number
}

const LABEL_TYPE_LABEL: Record<LabelType, string> = {
  numeric: '123',
  alpha:   'abc',
  mixed:   'a1b',
  emoji:   '😀',
}

function LabelTypeBadge({ type }: { type: LabelType }) {
  return (
    <span
      className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium"
      style={{
        color: 'rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {LABEL_TYPE_LABEL[type]}
    </span>
  )
}

function UrgencyBar({ targetMs }: { targetMs: number }) {
  const remaining = targetMs - Date.now()
  const pct       = Math.max(0, Math.min(100, (remaining / GRACE_PERIOD_MS) * 100))
  const color     = pct > 60 ? '#34d399' : pct > 20 ? '#fbbf24' : '#f87171'

  return (
    <div
      className="h-[3px] w-full rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
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
      onClick={handleCopy}
      title={label ? `Copy ${label}` : 'Copy'}
      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded transition-colors shrink-0"
      style={{ color: copied ? '#2dd4bf' : 'rgba(255,255,255,0.25)' }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#2dd4bf' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
    >
      {copied
        ? <Check className="w-[12px] h-[12px]" />
        : <Copy className="w-[12px] h-[12px]" />
      }
    </button>
  )
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
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

  const suiScanUrl       = nft_id ? `${SUISCAN_BASE}/${nft_id}` : null
  const countdownTarget  = domain_status === 'grace' ? grace_period_end_ms : expiry_timestamp_ms
  const countdownVariant = domain_status === 'grace' ? 'grace' : 'expiry'

  const expiryDisplay = formatExpiryDate(expiry_timestamp_ms)
  const graceDisplay  = formatExpiryDate(grace_period_end_ms)
  const shortDate     = domain_status === 'grace'
    ? formatExpiryDateShort(grace_period_end_ms)
    : formatExpiryDateShort(expiry_timestamp_ms)
  const droppedAgo = domain_status === 'expired'
    ? formatTimeRemaining(grace_period_end_ms)
    : null

  const rowNum = String(index).padStart(2, '0')

  const cardBase = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.09)',
    transition: 'background 0.15s ease, border-color 0.15s ease',
  }
  const cardHover = {
    background: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.16)',
  }

  return (
    <>
      {/* ── DESKTOP ─────────────────────────────────────────────── */}
      <div
        className="hidden md:grid gap-4 items-center px-4 py-3.5 mb-1.5 rounded-xl"
        style={{ ...cardBase, gridTemplateColumns: '44px 1fr 170px 120px 220px' }}
        onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, cardHover)}
        onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, cardBase)}
      >

        {/* Row number */}
        <div className="flex items-center justify-center">
          <span
            className="text-[11px] font-mono tabular-nums select-none"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            {rowNum}
          </span>
        </div>

        {/* Domain + owner */}
        <div className="min-w-0">
          <div className="flex items-center">
            <span className="font-mono text-[14px] font-medium text-zinc-100 truncate">
              {name}
            </span>
            <LabelTypeBadge type={label_type} />
            <div className="flex items-center ml-2 gap-0.5">
              <CopyButton value={name} label="domain name" />
              {suiScanUrl && (
                <a
                  href={suiScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on SuiScan"
                  className="inline-flex items-center justify-center w-[18px] h-[18px] rounded transition-colors"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#2dd4bf')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                >
                  <ExternalLink className="w-[12px] h-[12px]" />
                </a>
              )}
            </div>
          </div>

          {owner_address && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {truncateAddress(owner_address)}
              </span>
              <CopyButton value={owner_address} label="owner address" />
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="flex flex-col gap-2">
          {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}
          {domain_status === 'expired' ? (
            <span className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {droppedAgo}
            </span>
          ) : (
            <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
          )}
        </div>

        {/* Short date */}
        <div className="text-right">
          <div className="text-[12px] font-mono text-zinc-500">{shortDate}</div>
          {domain_status === 'grace'   && (
            <div className="text-[10px] text-amber-500 mt-0.5">grace ends</div>
          )}
          {domain_status === 'expired' && (
            <div className="text-[10px] text-emerald-500 mt-0.5">available</div>
          )}
        </div>

        {/* Exact UTC timestamps + copy buttons */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[11px] select-all"
              style={{ color: 'rgba(255,255,255,0.38)' }}
            >
              {expiryDisplay}
            </span>
            <CopyButton value={expiryDisplay} label="expiry timestamp" />
          </div>
          {domain_status !== 'expired' && (
            <div className="flex items-center gap-1.5">
              <span
                className="font-mono text-[11px] select-all"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                {graceDisplay}
              </span>
              <CopyButton value={graceDisplay} label="grace end timestamp" />
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────────────────────── */}
      <div
        className="md:hidden mb-2 rounded-xl overflow-hidden"
        style={cardBase}
      >
        {/* Top row */}
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <span
            className="text-[10px] font-mono tabular-nums shrink-0 select-none w-5 text-right"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            {rowNum}
          </span>
          <span className="font-mono text-[14px] font-medium text-zinc-100 truncate flex-1">
            {name}
          </span>
          <LabelTypeBadge type={label_type} />
          <div className="flex items-center gap-0.5 ml-1">
            <CopyButton value={name} label="domain name" />
            {suiScanUrl && (
              <a
                href={suiScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2dd4bf')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              >
                <ExternalLink className="w-[12px] h-[12px]" />
              </a>
            )}
          </div>
        </div>

        <div className="px-4 pb-3.5 pt-2.5 space-y-3">

          {/* Owner */}
          {owner_address && (
            <div className="flex items-center gap-1">
              <span
                className="text-[11px] font-mono"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {truncateAddress(owner_address)}
              </span>
              <CopyButton value={owner_address} label="owner address" />
            </div>
          )}

          {/* Urgency bar */}
          {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}

          {/* Countdown or dropped */}
          {domain_status === 'expired' ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Dropped {droppedAgo}
              </span>
              <span className="text-[12px] font-medium text-emerald-400">Available</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
              <span className="text-[12px] font-mono text-zinc-500">{shortDate}</span>
            </div>
          )}

          {/* Timestamps panel */}
          <div
            className="rounded-lg px-3 py-2.5 space-y-2"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-wider w-10 shrink-0"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Expiry
              </span>
              <span
                className="font-mono text-[11px] select-all flex-1 truncate"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {expiryDisplay}
              </span>
              <CopyButton value={expiryDisplay} label="expiry" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-wider w-10 shrink-0"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Grace
              </span>
              <span
                className="font-mono text-[11px] select-all flex-1 truncate"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                {graceDisplay}
              </span>
              <CopyButton value={graceDisplay} label="grace end" />
            </div>
          </div>

          {domain_status === 'grace' && (
            <div className="text-[11px] text-center" style={{ color: 'rgba(251,191,36,0.8)' }}>
              Grace period — original owner can still renew
            </div>
          )}
        </div>
      </div>
    </>
  )
}
