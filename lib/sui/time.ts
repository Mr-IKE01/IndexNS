import { GRACE_PERIOD_MS } from './constants'
import type { DomainStatus } from '@/types/domain'

/**
 * Safely parses an on-chain expiry value into a plain JS number (milliseconds).
 * Handles string | number | bigint — Sui returns it as a string like "1729154178765".
 * Throws if the value is missing, NaN, or clearly invalid (negative or impossibly small).
 */
export function parseExpiryMs(raw: string | number | bigint | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') {
    throw new Error(`parseExpiryMs: received null/undefined value`)
  }

  let ms: number

  if (typeof raw === 'bigint') {
    // bigint → number is safe here because JS max safe integer (2^53-1) covers
    // unix ms timestamps well past year 285,000. No SuiNS domain expires then.
    ms = Number(raw)
  } else if (typeof raw === 'string') {
    ms = Number(raw)
  } else {
    ms = raw
  }

  if (!Number.isFinite(ms)) {
    throw new Error(`parseExpiryMs: non-finite result from value "${raw}"`)
  }

  if (ms <= 0) {
    throw new Error(`parseExpiryMs: value "${raw}" produced a non-positive timestamp`)
  }

  // Sanity check: must be after 2020-01-01 (1577836800000 ms)
  // Guards against accidentally passing seconds instead of milliseconds
  if (ms < 1_577_836_800_000) {
    throw new Error(
      `parseExpiryMs: value "${raw}" looks like seconds, not milliseconds (too small)`
    )
  }

  return ms
}

/**
 * Computes the grace period end timestamp.
 * Always exactly GRACE_PERIOD_MS (30 days) after expiry — never stored on-chain.
 */
export function computeGracePeriodEnd(expiryMs: number): number {
  return expiryMs + GRACE_PERIOD_MS
}

/**
 * Derives the current domain status from expiry and grace end timestamps.
 * Always computed fresh against Date.now() — never stored permanently.
 */
export function computeDomainStatus(
  expiryMs: number,
  gracePeriodEndMs: number,
  now = Date.now(),
): DomainStatus {
  if (now < expiryMs) return 'active'
  if (now < gracePeriodEndMs) return 'grace'
  return 'expired'
}

/**
 * Formats a Unix ms timestamp for display (e.g. "14 Jun 2025, 10:32 UTC").
 * Safe to call with any value — returns "—" if the timestamp is invalid.
 */
export function formatExpiryDate(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

/**
 * Returns a human-readable countdown string, e.g. "in 3d 4h" or "2h ago".
 * Used in the UI to show time-to-expiry or time-since-expiry.
 */
export function formatTimeRemaining(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'

  const diff = ms - Date.now()
  const abs = Math.abs(diff)
  const past = diff < 0

  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)

  let label: string
  if (days > 0) {
    label = `${days}d ${hours}h`
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`
  } else {
    label = `${minutes}m`
  }

  return past ? `${label} ago` : `in ${label}`
}
