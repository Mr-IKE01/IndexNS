import { NextRequest, NextResponse } from 'next/server'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { bcs } from '@mysten/bcs'
import { createServerClient } from '@/lib/supabase/server'
import { parseDomainFromJson, nameToLabels } from '@/lib/sui/parser'
import { withRetry } from '@/lib/sui/retry'
import {
  SUINS_OBJECTS,
  DOMAIN_FIELD_TYPE,
  EVENTS,
  SUI_GRAPHQL_URL,
  DYNAMIC_FIELDS_PAGE_SIZE,
  MAX_PAGES_PER_INVOCATION,
} from '@/lib/sui/constants'
import { computeDomainStatus, computeGracePeriodEnd } from '@/lib/sui/time'
import type { SyncState } from '@/types/domain'

// Vercel Hobby supports maxDuration up to 60 seconds
export const maxDuration = 60

// BCS schema for the Domain struct used as dynamic field name key
const DomainBcs = bcs.struct('Domain', {
  labels: bcs.vector(bcs.string()),
})

function getGrpcClient() {
  // SuiGrpcClient requires an explicit baseUrl in Node — 'mainnet' alone only
  // works in browser/Edge where the transport can resolve it from the network enum
  return new SuiGrpcClient({
    network: 'mainnet',
    baseUrl: 'https://sui-mainnet-rpc.mystenlabs.com',
  })
}

function getGraphQLClient() {
  return new SuiGraphQLClient({
    url: SUI_GRAPHQL_URL,
    network: 'mainnet',
  })
}

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // ── Load sync state ──────────────────────────────────────────────────────────
  const { data: state, error: stateError } = await supabase
    .from('sync_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateError || !state) {
    return NextResponse.json({ error: 'Failed to load sync state' }, { status: 500 })
  }

  const syncState = state as SyncState

  if (!syncState.bootstrap_complete) {
    return runBootstrap(syncState)
  }
  return runIncremental(syncState)
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP: Paginate all registry dynamic fields via gRPC
// ─────────────────────────────────────────────────────────────────────────────
async function runBootstrap(state: SyncState): Promise<NextResponse> {
  const sui = getGrpcClient()
  const supabase = createServerClient()

  const startTime = Date.now()
  let cursor: string | null = state.bootstrap_cursor
  let totalThisCall = 0
  let bootstrapComplete = false

  for (let page = 0; page < MAX_PAGES_PER_INVOCATION; page++) {
    // Leave 8s buffer before Vercel's 60s timeout
    if (Date.now() - startTime > 52_000) break

    // ── Step 1: Get a page of dynamic field entries ─────────────────────────
    let fieldPage: Awaited<ReturnType<typeof sui.listDynamicFields>>
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

    if (!fieldPage.dynamicFields.length) {
      bootstrapComplete = true
      break
    }

    // fieldId is the wrapper object ID — this is what we fetch content for
    const fieldIds = fieldPage.dynamicFields.map((f) => f.fieldId)

    // ── Step 2: Batch fetch full object content (json shape) ────────────────
    let objectsResult: Awaited<ReturnType<typeof sui.getObjects>>
    try {
      objectsResult = await withRetry(() =>
        sui.getObjects({
          objectIds: fieldIds,
          include: { json: true },
        })
      )
    } catch (err) {
      console.error('getObjects failed:', err)
      break
    }

    // ── Step 3: Parse — zip fieldId with json ──────────────────────────────
    const rows = objectsResult.objects
      .map((obj, i) => {
        if (obj instanceof Error) return null
        return parseDomainFromJson(
          fieldIds[i],
          obj.json as Record<string, unknown> | null,
        )
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    // ── Step 4: Upsert to Supabase ─────────────────────────────────────────
    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('suins_domains')
        .upsert(rows, { onConflict: 'object_id' })

      if (upsertError) {
        console.error('Upsert error:', upsertError.message)
      }
    }

    totalThisCall += rows.length
    cursor = fieldPage.cursor ?? null

    if (!fieldPage.hasNextPage) {
      bootstrapComplete = true
      break
    }
  }

  // ── Save progress ───────────────────────────────────────────────────────────
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
    pages_processed: Math.ceil(totalThisCall / DYNAMIC_FIELDS_PAGE_SIZE),
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

  // GraphQL query for events by Move event type with cursor pagination
  const EVENTS_QUERY = `
    query GetEvents($type: String!, $after: String) {
      events(
        filter: { type: $type }
        first: 100
        after: $after
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          contents {
            json
          }
          transaction {
            digest
          }
        }
      }
    }
  `

  // ── Process NameRegistered events ──────────────────────────────────────────
  try {
    const regResult = await withRetry(() =>
      graphql.query<{
        events: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
          nodes: Array<{
            contents: { json: Record<string, unknown> | null } | null
            transaction: { digest: string } | null
          }>
        }
      }>({
        query: EVENTS_QUERY,
        variables: {
          type: EVENTS.REGISTERED_V3,
          after: state.last_event_cursor_registered ?? undefined,
        },
      })
    )

    if (regResult.data?.events.nodes.length) {
      for (const event of regResult.data.events.nodes) {
        const name = event.contents?.json?.name
        if (typeof name !== 'string') continue

        const row = await fetchDomainByName(graphql, name)
        if (row) {
          await supabase
            .from('suins_domains')
            .upsert(row, { onConflict: 'name' })
          totalProcessed++
        }
      }

      const endCursor = regResult.data.events.pageInfo.endCursor
      if (endCursor) {
        await supabase
          .from('sync_state')
          .update({ last_event_cursor_registered: endCursor })
          .eq('id', 1)
      }
    }
  } catch (err) {
    console.error('NameRegistered event processing failed:', err)
  }

  // ── Process NameRenewed events ─────────────────────────────────────────────
  try {
    const renewResult = await withRetry(() =>
      graphql.query<{
        events: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
          nodes: Array<{
            contents: { json: Record<string, unknown> | null } | null
            transaction: { digest: string } | null
          }>
        }
      }>({
        query: EVENTS_QUERY,
        variables: {
          type: EVENTS.RENEWED_V3,
          after: state.last_event_cursor_renewed ?? undefined,
        },
      })
    )

    if (renewResult.data?.events.nodes.length) {
      for (const event of renewResult.data.events.nodes) {
        const name = event.contents?.json?.name
        if (typeof name !== 'string') continue

        const row = await fetchDomainByName(graphql, name)
        if (row) {
          await supabase
            .from('suins_domains')
            .upsert(row, { onConflict: 'name' })
          totalProcessed++
        }
      }

      const endCursor = renewResult.data.events.pageInfo.endCursor
      if (endCursor) {
        await supabase
          .from('sync_state')
          .update({ last_event_cursor_renewed: endCursor })
          .eq('id', 1)
      }
    }
  } catch (err) {
    console.error('NameRenewed event processing failed:', err)
  }

  // ── Sweep: flip active→grace and grace→expired ──────────────────────────────
  // Fast indexed SQL operations — run every incremental sync
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
// HELPER: Fetch a single domain from registry by name using gRPC getDynamicField
// ─────────────────────────────────────────────────────────────────────────────
async function fetchDomainByName(
  _graphql: SuiGraphQLClient,
  domainName: string,
) {
  const sui = getGrpcClient()
  try {
    const labels = nameToLabels(domainName)
    // BCS-encode the Domain struct for the dynamic field name lookup
    const nameBcs = DomainBcs.serialize({ labels }).toBytes()

    const result = await withRetry(() =>
      sui.getDynamicField({
        parentId: SUINS_OBJECTS.REGISTRY_TABLE,
        name: {
          type: DOMAIN_FIELD_TYPE,
          bcs: nameBcs,
        },
      })
    )

    const field = result.dynamicField
    if (!field?.fieldId) return null

    // Fetch the actual object content
    const objResult = await withRetry(() =>
      sui.getObjects({
        objectIds: [field.fieldId],
        include: { json: true },
      })
    )

    const obj = objResult.objects[0]
    if (!obj || obj instanceof Error) return null

    return parseDomainFromJson(
      field.fieldId,
      obj.json as Record<string, unknown> | null,
    )
  } catch {
    return null
  }
}
