import type { DomainStatus, LabelType, SuinsDomain } from '@/types/domain'
import { parseExpiryMs, computeGracePeriodEnd, computeDomainStatus } from './time'

type DomainRow = Omit<SuinsDomain, 'id' | 'created_at'>

// Minimal shape of the owner field returned by sui.getObjects()
// owner.$kind === 'AddressOwner' means a wallet directly holds the object
interface ObjectOwnerLike {
  $kind?: string
  AddressOwner?: string
}

/**
 * Extracts the wallet address from an object's `owner` field.
 * Returns null if the object isn't directly owned by an address
 * (e.g. shared, immutable, or object-owned).
 */
export function extractOwnerAddress(owner: unknown): string | null {
  if (!owner || typeof owner !== 'object') return null
  const o = owner as ObjectOwnerLike
  if (o.$kind === 'AddressOwner' && typeof o.AddressOwner === 'string') {
    return o.AddressOwner
  }
  return null
}

/**
 * Parses a raw object's json field (from getObjects with include: { json: true })
 * into a DB row. Returns null if the object is malformed or missing required fields.
 *
 * ownerAddress is passed in separately — it comes from a second getObjects call
 * on the NFT object itself (the registry wrapper object's owner is NOT the
 * domain owner; the NFT object's owner is).
 *
 * Expected json shape (confirmed from live mainnet testing):
 * {
 *   name: { fields: { labels: ["sui", "example"] } },
 *   value: {
 *     fields: {
 *       expiration_timestamp_ms: "1729154178765",
 *       nft_id: "0x...",
 *       target_address: "0x..."
 *     }
 *   }
 * }
 */
export function parseDomainFromJson(
  objectId: string,
  json: Record<string, unknown> | null | undefined,
  ownerAddress: string | null = null,
): DomainRow | null {
  try {
    if (!objectId || !json) return null

    // Navigate confirmed field paths
    // GraphQL returns: json.name.labels (no "fields" wrapper)
    // gRPC returned:   json.name.fields.labels
    // Support both shapes for compatibility
    const nameField = json.name as { fields?: { labels?: unknown }; labels?: unknown } | undefined
    const labels = nameField?.labels ?? nameField?.fields?.labels

    if (!Array.isArray(labels) || labels.length < 2) return null
    if (!labels.every((l): l is string => typeof l === 'string')) return null

    // labels = ["sui", "example"] → reverse → "example.sui"
    const name = [...labels].reverse().join('.')
    const label = labels[labels.length - 1].toLowerCase()
    const labelLength = label.length

    if (labelLength < 1) return null

    const valueField = json.value as {
      fields?: {
        expiration_timestamp_ms?: unknown
        nft_id?: unknown
        target_address?: unknown
      }
      expiration_timestamp_ms?: unknown
      nft_id?: unknown
      target_address?: unknown
    } | undefined

    // Support both GraphQL shape (no "fields" wrapper) and gRPC shape (with "fields" wrapper)
    const vf = (valueField?.expiration_timestamp_ms !== undefined ? valueField : valueField?.fields) as {
      expiration_timestamp_ms?: unknown
      nft_id?: unknown
      target_address?: unknown
    } | undefined

    if (!vf?.expiration_timestamp_ms) return null

    // Use the bulletproof parser — throws on any invalid value
    const expiryMs = parseExpiryMs(vf.expiration_timestamp_ms as string)
    const gracePeriodEndMs = computeGracePeriodEnd(expiryMs)
    const domainStatus: DomainStatus = computeDomainStatus(expiryMs, gracePeriodEndMs)

    // Classify label type
    const labelType: LabelType =
      /^\d+$/.test(label) ? 'numeric' :
      /^[a-z]+$/.test(label) ? 'alpha' :
      /\p{Emoji_Presentation}/u.test(label) ? 'emoji' :
      'mixed'

    const nft_id = typeof vf.nft_id === 'string' ? vf.nft_id : null
    const target_address =
      typeof vf.target_address === 'string' ? vf.target_address : null

    return {
      object_id: objectId,
      name,
      label,
      label_length: labelLength,
      label_type: labelType,
      nft_id,
      target_address,
      owner_address: ownerAddress,
      expiry_timestamp_ms: expiryMs,
      grace_period_end_ms: gracePeriodEndMs,
      domain_status: domainStatus,
      updated_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Converts "example.sui" → ["sui", "example"]
 * Used when building BCS-encoded name lookups for getDynamicField.
 */
export function nameToLabels(domainName: string): string[] {
  return domainName.toLowerCase().trim().split('.').reverse()
}
