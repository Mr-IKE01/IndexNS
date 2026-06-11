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
import type { SyncState } from '@/types/domain'

export const maxDuration = 60

const DomainBcs = bcs.struct('Domain', { labels: bcs.vector(bcs.string()) })

function getGrpcClient() {
  return new SuiGrpcClient({
    network: 'mainnet',
    baseUrl: 'https://sui-mainnet-rpc.mystenlabs.com',
  })
}

function getGraphQLClient() {
  return new SuiGraphQLClient({ url: SUI_GRAPHQL_URL, network: 'mainnet' })
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
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

async function runBootstrap(state: SyncState): Promise<NextResponse> {
  const sui = getGrpcClient()
  const supabase = createServerClient()
  const startTime = Date.now()
  let cursor: string | null = state.bootstrap_cursor
  let totalThisCall = 0
  let bootstrapComplete = false

  for (let page = 0; page < MAX_PAGES_PER_INVOCATION; page++) {
    if (Date.now() - startTime > 52_000) break

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

    if (!fieldPage.dynamicFields.length) { bootstrapComplete = true; break }

    const fieldIds = fieldPage.dynamicFields.map((f) => f.fieldId)

    let objectsResult: Awaited<ReturnType<typeof sui.getObjects>>
    try {
      objectsResult = await withRetry(() =>
        sui.getObjects({ objectIds: fieldIds, include: { json: true } })
      )
    } catch (err) {
      console.error('getObjects failed:', err)
      break
    }

    const rows = objectsResult.objects
      .map((obj, i) => {
        if (obj instanceof Error) return null
        // Cast through unknown because json type depends on generic Include parameter
        const json = (obj.json as unknown) as Record<string, unknown> | null | undefined
        return parseDomainFromJson(fieldIds[i], json)
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('suins_domains')
        .upsert(rows, { onConflict: 'object_id' })
      if (upsertError) console.error('Upsert error:', upsertError.message)
    }

    totalThisCall += rows.length
    cursor = fieldPage.cursor ?? null
    if (!fieldPage.hasNextPage) { bootstrapComplete = true; break }
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
    return parseDomainFromJson(field.fieldId, json)
  } catch {
    return null
  }
}
