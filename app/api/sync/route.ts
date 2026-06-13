import { NextRequest, NextResponse } from 'next/server'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { bcs } from '@mysten/bcs'
import { createServerClient } from '@/lib/supabase/server'
import { parseDomainFromJson, nameToLabels, extractOwnerAddress } from '@/lib/sui/parser'
import { withRetry } from '@/lib/sui/retry'
import {
  SUINS_OBJECTS,
  DOMAIN_FIELD_TYPE,
  EVENTS,
  SUI_GRAPHQL_URL,
  DYNAMIC_FIELDS_PAGE_SIZE,
  MAX_PAGES_PER_INVOCATION,
} from '@/lib/sui/constants'
import type { SyncState } from '@/types/domain'

export const maxDuration = 60

const DomainBcs = bcs.struct('Domain', { labels: bcs.vector(bcs.string()) })

function getGrpcClient() {
  const transport = new GrpcWebFetchTransport({
    baseUrl: 'https://sui-mainnet-rpc.mystenlabs.com',
  })
  return new SuiGrpcClient({ network: 'mainnet', transport })
}

function getGraphQLClient() {
  return new SuiGraphQLClient({ url: SUI_GRAPHQL_URL, network: 'mainnet' })
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
    ?? request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: state, error: stateError } = await supabase
    .from('sync_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateError || !state) {
    return NextResponse.json({ error: 'Failed to load sync state' }, { status: 500 })
  }

  const syncState = state as SyncState
  if (!syncState.bootstrap_complete) return runBootstrap(syncState)
  return runIncremental(syncState)
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch owner addresses for a batch of NFT IDs.
// Returns a Map<nftId, ownerAddress | null>. NFTs that fail to fetch are omitted
// (treated as null when looked up).
// ─────────────────────────────────────────────────────────────────────────────
async function fetchOwnerMap(
  sui: ReturnType<typeof getGrpcClient>,
  nftIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (nftIds.length === 0) return map

  try {
    const result = await withRetry(() =>
      sui.getObjects({ objectIds: nftIds, include: { json: false } })
    )

    result.objects.forEach((obj, i) => {
      if (obj instanceof Error) return
      map.set(nftIds[i], extractOwnerAddress(obj.owner))
    })
  } catch (err) {
    console.error('fetchOwnerMap failed:', err)
  }

  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP: Paginate registry dynamic fields with a prefetch pipeline.
//
// For each page N, we run THREE things:
//   1. Fetch content for page N's wrapper objects (the slow part)
//   2. In parallel, prefetch the dynamic-field LIST for page N+1 (hides latency)
//   3. After (1) completes, fetch owner addresses for page N's NFTs (sequential —
//      needs nft_ids extracted from page N's content first)
// ─────────────────────────────────────────────────────────────────────────────
async function runBootstrap(state: SyncState): Promise<NextResponse> {
  const sui = getGrpcClient()
  const supabase = createServerClient()

  const startTime = Date.now()
  let cursor: string | null = state.bootstrap_cursor
  let totalThisCall = 0
  let bootstrapComplete = false

  // Prefetched page from the previous iteration (null on first iteration)
  let prefetchedPage: Awaited<ReturnType<typeof sui.listDynamicFields>> | null = null

  for (let page = 0; page < MAX_PAGES_PER_INVOCATION; page++) {
    if (Date.now() - startTime > 50_000) break

    // ── Step 1: Get current page's field list (use prefetch if available) ──
    let fieldPage: Awaited<ReturnType<typeof sui.listDynamicFields>>
    if (prefetchedPage) {
      fieldPage = prefetchedPage
      prefetchedPage = null
    } else {
      try {
        fieldPage = await withRetry(() =>
          sui.listDynamicFields({
            parentId: SUINS_OBJECTS.REGISTRY_TABLE,
            cursor: cursor ?? undefined,
            limit: DYNAMIC_FIELDS_PAGE_SIZE,
          })
        )
      } catch (err) {
        console.error('listDynamicFields failed:', err)
        break
      }
    }

    if (!fieldPage.dynamicFields.length) {
      bootstrapComplete = true
      break
    }

    const fieldIds = fieldPage.dynamicFields.map((f) => f.fieldId)
    const nextCursor = fieldPage.cursor ?? null
    const hasNextPage = fieldPage.hasNextPage

    // ── Step 2: Fetch content for THIS page, prefetch NEXT page's field list,
    //            both in parallel ─────────────────────────────────────────
    const [objectsResult, nextFieldPage] = await Promise.all([
      withRetry(() =>
        sui.getObjects({ objectIds: fieldIds, include: { json: true } })
      ).catch((err) => {
        console.error('getObjects (content) failed:', err)
        return null
      }),
      hasNextPage
        ? withRetry(() =>
            sui.listDynamicFields({
              parentId: SUINS_OBJECTS.REGISTRY_TABLE,
              cursor: nextCursor ?? undefined,
              limit: DYNAMIC_FIELDS_PAGE_SIZE,
            })
          ).catch((err) => {
            console.error('prefetch listDynamicFields failed:', err)
            return null
          })
        : Promise.resolve(null),
    ])

    if (!objectsResult) break

    // Stash the prefetched next page for the following iteration
    prefetchedPage = nextFieldPage

    // ── Step 3: Parse content (without owner yet) ───────────────────────
    const parsed = objectsResult.objects.map((obj, i) => {
      if (obj instanceof Error) return null
      const json = (obj.json as unknown) as Record<string, unknown> | null | undefined
      return { fieldId: fieldIds[i], row: parseDomainFromJson(fieldIds[i], json) }
    })

    // ── Step 4: Collect nft_ids and fetch owner addresses ────────────────
    const nftIds = parsed
      .map((p) => p?.row?.nft_id)
      .filter((id): id is string => typeof id === 'string')

    const ownerMap = await fetchOwnerMap(sui, nftIds)

    // ── Step 5: Attach owner_address, build final rows ───────────────────
    const rows = parsed
      .filter((p): p is NonNullable<typeof p> => p !== null && p.row !== null)
      .map((p) => {
        const row = p.row!
        const owner = row.nft_id ? ownerMap.get(row.nft_id) ?? null : null
        return { ...row, owner_address: owner }
      })

    // ── Step 6: Upsert ────────────────────────────────────────────────────
    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('suins_domains')
        .upsert(rows, { onConflict: 'object_id' })

      if (upsertError) console.error('Upsert error:', upsertError.message)
    }

    totalThisCall += rows.length
    cursor = nextCursor

    if (!hasNextPage) {
      bootstrapComplete = true
      break
    }
  }

  await supabase
    .from('sync_state')
    .update({
      bootstrap_cursor: bootstrapComplete ? null : cursor,
      bootstrap_complete: bootstrapComplete,
      total_indexed: (state.total_indexed ?? 0) + totalThisCall,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', 1)

  return NextResponse.json({
    mode: 'bootstrap',
    domains_this_call: totalThisCall,
    total_indexed: (state.total_indexed ?? 0) + totalThisCall,
    bootstrap_complete: bootstrapComplete,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// INCREMENTAL: Query new events via GraphQL + sweep status changes
// ─────────────────────────────────────────────────────────────────────────────
async function runIncremental(state: SyncState): Promise<NextResponse> {
  const graphql = getGraphQLClient()
  const supabase = createServerClient()
  let totalProcessed = 0

  const EVENTS_QUERY = `
    query GetEvents($type: String!, $after: String) {
      events(filter: { type: $type } first: 100 after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          contents { json }
          transaction { digest }
        }
      }
    }
  `

  type EventsResult = {
    events: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{
        contents: { json: Record<string, unknown> | null } | null
        transaction: { digest: string } | null
      }>
    }
  }

  const eventPairs: [string, keyof SyncState][] = [
    [EVENTS.REGISTERED_V3, 'last_event_cursor_registered'],
    [EVENTS.RENEWED_V3, 'last_event_cursor_renewed'],
  ]

  for (const [eventType, cursorKey] of eventPairs) {
    try {
      const result = await withRetry(() =>
        graphql.query<EventsResult>({
          query: EVENTS_QUERY,
          variables: {
            type: eventType,
            after: (state[cursorKey] as string | null) ?? undefined,
          },
        })
      )

      if (result.data?.events.nodes.length) {
        for (const event of result.data.events.nodes) {
          const name = event.contents?.json?.name
          if (typeof name !== 'string') continue
          const row = await fetchDomainByName(name)
          if (row) {
            await supabase.from('suins_domains').upsert(row, { onConflict: 'name' })
            totalProcessed++
          }
        }
        const endCursor = result.data.events.pageInfo.endCursor
        if (endCursor) {
          await supabase.from('sync_state').update({ [cursorKey]: endCursor }).eq('id', 1)
        }
      }
    } catch (err) {
      console.error(`Event processing failed for ${eventType}:`, err)
    }
  }

  const now = Date.now()
  await supabase
    .from('suins_domains')
    .update({ domain_status: 'grace', updated_at: new Date().toISOString() })
    .eq('domain_status', 'active')
    .lt('expiry_timestamp_ms', now)

  await supabase
    .from('suins_domains')
    .update({ domain_status: 'expired', updated_at: new Date().toISOString() })
    .eq('domain_status', 'grace')
    .lt('grace_period_end_ms', now)

  await supabase
    .from('sync_state')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', 1)

  return NextResponse.json({ mode: 'incremental', processed: totalProcessed })
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Fetch a single domain (+ owner) from registry by name
// ─────────────────────────────────────────────────────────────────────────────
async function fetchDomainByName(domainName: string) {
  const sui = getGrpcClient()
  try {
    const labels = nameToLabels(domainName)
    const nameBcs = DomainBcs.serialize({ labels }).toBytes()

    const result = await withRetry(() =>
      sui.getDynamicField({
        parentId: SUINS_OBJECTS.REGISTRY_TABLE,
        name: { type: DOMAIN_FIELD_TYPE, bcs: nameBcs },
      })
    )

    const field = result.dynamicField
    if (!field?.fieldId) return null

    const objResult = await withRetry(() =>
      sui.getObjects({ objectIds: [field.fieldId], include: { json: true } })
    )

    const obj = objResult.objects[0]
    if (!obj || obj instanceof Error) return null

    const json = (obj.json as unknown) as Record<string, unknown> | null | undefined
    const parsed = parseDomainFromJson(field.fieldId, json)
    if (!parsed) return null

    // Fetch owner if we have an nft_id
    if (parsed.nft_id) {
      const ownerMap = await fetchOwnerMap(sui, [parsed.nft_id])
      parsed.owner_address = ownerMap.get(parsed.nft_id) ?? null
    }

    return parsed
  } catch {
    return null
  }
}
export const GET = POST
