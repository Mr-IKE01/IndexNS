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

const LABEL_TYPE_LABEL: Record<LabelType, string> = {
  numeric: '123',
  alpha: 'abc',
  mixed: 'a1b',
  emoji: '😀',
}

function LabelTypeBadge({ type }: { type: LabelType }) {
  return (
    <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-500 bg-white/[0.04] border border-white/[0.06]">
      {LABEL_TYPE_LABEL[type]}
    </span>
  )
}

function UrgencyBar({ targetMs }: { targetMs: number }) {
  const remaining = targetMs - Date.now()
  const pct = Math.max(0, Math.min(100, (remaining / GRACE_PERIOD_MS) * 100))
  const colorClass = pct > 60 ? 'bg-emerald-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
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
      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded text-zinc-600 hover:text-teal-400 transition-colors shrink-0"
    >
      {copied ? <Check className="w-[13px] h-[13px]" /> : <Copy className="w-[13px] h-[13px]" />}
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
  const countdownTarget = domain_status === 'grace' ? grace_period_end_ms : expiry_timestamp_ms
  const countdownVariant = domain_status === 'grace' ? 'grace' : 'expiry'

  const expiryDisplay = formatExpiryDate(expiry_timestamp_ms)
  const graceDisplay = formatExpiryDate(grace_period_end_ms)
  const shortDate = domain_status === 'grace'
    ? formatExpiryDateShort(grace_period_end_ms)
    : formatExpiryDateShort(expiry_timestamp_ms)
  const droppedAgo = domain_status === 'expired' ? formatTimeRemaining(grace_period_end_ms) : null

  return (
    <>
      {/* ── DESKTOP ─────────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[1fr_170px_120px_220px] gap-4 items-center px-5 py-4 border-b border-white/[0.05] hover:bg-white/[0.015] transition-colors">

        <div className="min-w-0">
          <div className="flex items-center">
            <span className="font-mono text-[14px] font-medium text-zinc-100 truncate">{name}</span>
            <LabelTypeBadge type={label_type} />
            <div className="flex items-center ml-2 gap-0.5">
              <CopyButton value={name} label="domain name" />
              {suiScanUrl && (
                <a
                  href={suiScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on SuiScan"
                  className="inline-flex items-center justify-center w-[18px] h-[18px] rounded text-zinc-600 hover:text-teal-400 transition-colors"
                >
                  <ExternalLink className="w-[13px] h-[13px]" />
                </a>
              )}
            </div>
          </div>
          {owner_address && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[11px] font-mono text-zinc-600">{truncateAddress(owner_address)}</span>
              <CopyButton value={owner_address} label="owner address" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}
          {domain_status === 'expired' ? (
            <span className="text-[12px] font-mono text-zinc-600">{droppedAgo}</span>
          ) : (
            <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
          )}
        </div>

        <div className="text-right">
          <div className="text-[12px] font-mono text-zinc-500">{shortDate}</div>
          {domain_status === 'grace' && <div className="text-[10px] text-amber-500 mt-0.5">grace ends</div>}
          {domain_status === 'expired' && <div className="text-[10px] text-emerald-500 mt-0.5">available</div>}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-zinc-500 select-all">{expiryDisplay}</span>
            <CopyButton value={expiryDisplay} label="expiry timestamp" />
          </div>
          {domain_status !== 'expired' && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-zinc-600 select-all">{graceDisplay}</span>
              <CopyButton value={graceDisplay} label="grace end timestamp" />
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────────────────────── */}
      <div className="md:hidden mx-3 mb-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">

        <div className="flex items-center">
          <span className="font-mono text-[14px] font-medium text-zinc-100 truncate flex-1">{name}</span>
          <LabelTypeBadge type={label_type} />
          <div className="flex items-center ml-2 gap-0.5">
            <CopyButton value={name} label="domain name" />
            {suiScanUrl && (
              <a href={suiScanUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded text-zinc-600">
                <ExternalLink className="w-[13px] h-[13px]" />
              </a>
            )}
          </div>
        </div>

        {owner_address && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-600">{truncateAddress(owner_address)}</span>
            <CopyButton value={owner_address} label="owner" />
          </div>
        )}

        {domain_status !== 'expired' && <UrgencyBar targetMs={countdownTarget} />}

        {domain_status === 'expired' ? (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-zinc-500">Dropped {droppedAgo}</span>
            <span className="text-[12px] font-medium text-emerald-500">Available</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <CountdownTimer targetMs={countdownTarget} variant={countdownVariant} />
            <span className="text-[12px] font-mono text-zinc-500">{shortDate}</span>
          </div>
        )}

        <div className="rounded-lg bg-black/20 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-600 w-10 shrink-0">Expiry</span>
            <span className="font-mono text-[11px] text-zinc-400 select-all flex-1 truncate">{expiryDisplay}</span>
            <CopyButton value={expiryDisplay} label="expiry" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-600 w-10 shrink-0">Grace</span>
            <span className="font-mono text-[11px] text-zinc-500 select-all flex-1 truncate">{graceDisplay}</span>
            <CopyButton value={graceDisplay} label="grace end" />
          </div>
        </div>

        {domain_status === 'grace' && (
          <div className="text-[11px] text-center text-amber-500/90">
            Grace period — original owner can still renew
          </div>
        )}
      </div>
    </>
  )
}
