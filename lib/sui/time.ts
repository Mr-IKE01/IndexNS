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
 * Pads a number to 2 digits with a leading zero.
 */
function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Formats a Unix ms timestamp in the exact, copyable, unambiguous format:
 * "2026-06-30 21:21:06 UTC"
 *
 * This is the PRIMARY format — used anywhere the exact timestamp matters
 * (sniping, scheduling, verification against on-chain data).
 * Safe to call with any value — returns "—" if the timestamp is invalid.
 */
export function formatExpiryDate(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'

  const d = new Date(ms)
  const year = d.getUTCFullYear()
  const month = pad2(d.getUTCMonth() + 1)
  const day = pad2(d.getUTCDate())
  const hours = pad2(d.getUTCHours())
  const minutes = pad2(d.getUTCMinutes())
  const seconds = pad2(d.getUTCSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
}

/**
 * Formats a Unix ms timestamp as a short, human-readable date:
 * "30 Jun 2026"
 *
 * This is the SECONDARY format — used as an at-a-glance label next to
 * the primary copyable timestamp. Never used for anything precise.
 * Safe to call with any value — returns "—" if the timestamp is invalid.
 */
export function formatExpiryDateShort(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'

  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
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
