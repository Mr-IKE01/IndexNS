import { NextRequest, NextResponse } from 'next/server'
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

function getGraphQLClient() {
  return new SuiGraphQLClient({ url: SUI_GRAPHQL_URL, network: 'mainnet' })
}

const BOOTSTRAP_QUERY = `
  query GetDynamicFields($parentId: SuiAddress!, $first: Int!, $after: String) {
    object(address: $parentId) {
      dynamicFields(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          address
          contents { json }
          value {
            __typename
            ... on MoveValue { json }
            ... on MoveObject {
              contents { json }
              owner {
                __typename
                ... on AddressOwner { owner { address } }
              }
            }
          }
        }
      }
    }
  }
`

const SINGLE_DOMAIN_QUERY = `
  query GetDomainByName($parentId: SuiAddress!, $nameType: String!, $nameBcs: Base64!) {
    object(address: $parentId) {
      dynamicField(name: { type: $nameType, bcs: $nameBcs }) {
        address
        value {
          __typename
          ... on MoveValue { json }
          ... on MoveObject {
            contents { json }
            owner {
              __typename
              ... on AddressOwner { owner { address } }
            }
          }
        }
      }
    }
  }
`

type DFValueOwner = {
  __typename?: string
  owner?: { address?: string }
} | null

type DFValue = {
  __typename: string
  json?: Record<string, unknown> | null
  contents?: { json: Record<string, unknown> | null } | null
  owner?: DFValueOwner
} | null

type DFNode = {
  address: string
  contents: { json: Record<string, unknown> | null } | null
  value: DFValue
}

function extractOwnerFromValue(value: DFValue): string | null {
  if (value?.__typename === 'MoveObject') {
    const o = value.owner as DFValueOwner
    if (o?.__typename === 'AddressOwner') return o.owner?.address ?? null
  }
  return null
}

function extractValueJson(value: DFValue): Record<string, unknown> | null {
  if (!value) return null
  if (value.__typename === 'MoveObject') return value.contents?.json ?? null
  return value.json ?? null
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
    ?? request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: state, error: stateError } = await supabase
    .from('sync_state').select('*').eq('id', 1).single()

  if (stateError || !state) {
    return NextResponse.json({ error: 'Failed to load sync state' }, { status: 500 })
  }

  const syncState = state as SyncState
  if (!syncState.bootstrap_complete) return runBootstrap(syncState)
  return runIncremental(syncState)
}

async function runBootstrap(state: SyncState): Promise<NextResponse> {
  const graphql = getGraphQLClient()
  const supabase = createServerClient()

  const startTime = Date.now()
  let cursor: string | null = state.bootstrap_cursor
  let totalThisCall = 0
  let bootstrapComplete = false

  for (let page = 0; page < MAX_PAGES_PER_INVOCATION; page++) {
    if (Date.now() - startTime > 50_000) break

    type BootstrapResult = {
      object: {
        dynamicFields: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
          nodes: DFNode[]
        }
      } | null
    }

    let result: { data?: BootstrapResult }
    try {
      result = await withRetry(() =>
        graphql.query<BootstrapResult>({
          query: BOOTSTRAP_QUERY,
          variables: {
            parentId: SUINS_OBJECTS.REGISTRY_TABLE,
            first: DYNAMIC_FIELDS_PAGE_SIZE,
            after: cursor ?? undefined,
          },
        })
      )
    } catch (err) {
      console.error('Bootstrap GraphQL query failed:', err)
      break
    }

    const fields = result.data?.object?.dynamicFields
    console.log('[bootstrap] full result:', JSON.stringify(result.data), JSON.stringify(result.errors ?? 'no errors'))
    if (!fields?.nodes?.length) { bootstrapComplete = true; break }

    const rows = fields.nodes.map((node) => {
      const contentJson = node.contents?.json
      if (!contentJson) return null

      const ownerAddress = extractOwnerFromValue(node.value)
      const valueJson = extractValueJson(node.value)

      const merged: Record<string, unknown> = {
        name: contentJson,
        value: { fields: valueJson },
      }

      return parseDomainFromJson(node.address, merged, ownerAddress)
    }).filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('suins_domains')
        .upsert(rows, { onConflict: 'object_id' })
      if (upsertError) console.error('Upsert error:', upsertError.message)
    }

    totalThisCall += rows.length
    cursor = fields.pageInfo.endCursor ?? null
    if (!fields.pageInfo.hasNextPage) { bootstrapComplete = true; break }
  }

  await supabase.from('sync_state').update({
    bootstrap_cursor: bootstrapComplete ? null : cursor,
    bootstrap_complete: bootstrapComplete,
    total_indexed: (state.total_indexed ?? 0) + totalThisCall,
    last_synced_at: new Date().toISOString(),
  }).eq('id', 1)

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
          const row = await fetchDomainByName(graphql, name)
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
  await supabase.from('suins_domains')
    .update({ domain_status: 'grace', updated_at: new Date().toISOString() })
    .eq('domain_status', 'active').lt('expiry_timestamp_ms', now)

  await supabase.from('suins_domains')
    .update({ domain_status: 'expired', updated_at: new Date().toISOString() })
    .eq('domain_status', 'grace').lt('grace_period_end_ms', now)

  await supabase.from('sync_state')
    .update({ last_synced_at: new Date().toISOString() }).eq('id', 1)

  return NextResponse.json({ mode: 'incremental', processed: totalProcessed })
}

async function fetchDomainByName(graphql: SuiGraphQLClient, domainName: string) {
  try {
    const labels = nameToLabels(domainName) // ["sui", "example"]
    const nameBcs = DomainBcs.serialize({ labels }).toBytes()
    const nameBcsBase64 = Buffer.from(nameBcs).toString('base64')

    type SingleResult = {
      object: {
        dynamicField: {
          address: string
          value: DFValue
        } | null
      } | null
    }

    const result = await withRetry(() =>
      graphql.query<SingleResult>({
        query: SINGLE_DOMAIN_QUERY,
        variables: {
          parentId: SUINS_OBJECTS.REGISTRY_TABLE,
          nameType: DOMAIN_FIELD_TYPE,
          nameBcs: nameBcsBase64,
        },
      })
    )

    const field = result.data?.object?.dynamicField
    if (!field) return null

    const ownerAddress = extractOwnerFromValue(field.value)
    const valueJson = extractValueJson(field.value)

    const merged: Record<string, unknown> = {
      name: { fields: { labels } },
      value: { fields: valueJson },
    }

    return parseDomainFromJson(field.address, merged, ownerAddress)
  } catch (err) {
    console.error('fetchDomainByName failed:', err)
    return null
  }
}

export const GET = POST
