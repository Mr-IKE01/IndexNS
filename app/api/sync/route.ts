import { NextRequest, NextResponse } from 'next/server'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { bcs } from '@mysten/bcs'
import { createServerClient } from '@/lib/supabase/server'
import { parseDomainFromJson, nameToLabels } from '@/lib/sui/parser'
import { parseExpiryMs, computeGracePeriodEnd, computeDomainStatus } from '@/lib/sui/time'
import { withRetry } from '@/lib/sui/retry'
import {
  SUINS_OBJECTS,
  SUINS_PACKAGES,
  EVENTS,
  SUI_GRAPHQL_URL,
  DYNAMIC_FIELDS_PAGE_SIZE,
  MAX_PAGES_PER_INVOCATION,
} from '@/lib/sui/constants'
import type { SyncState, LabelType, DomainStatus } from '@/types/domain'

export const maxDuration = 60

const DomainBcs = bcs.struct('Domain', { labels: bcs.vector(bcs.string()) })

function getGraphQLClient() {
  return new SuiGraphQLClient({ url: SUI_GRAPHQL_URL, network: 'mainnet' })
}

const GET_LATEST_CHECKPOINT_QUERY = `
  query GetLatestCheckpoint {
    checkpoint {
      sequenceNumber
    }
  }
`

const BOOTSTRAP_QUERY = `
  query GetDynamicFields($registryId: SuiAddress!, $checkpoint: UInt53!, $first: Int!, $after: String) {
    address(address: $registryId) {
      addressAt(checkpoint: $checkpoint) {
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
                  ... on AddressOwner { address { address } }
                }
              }
            }
          }
        }
      }
    }
  }
`

type DFValue = {
  __typename: string
  json?: Record<string, unknown> | null
  contents?: { json: Record<string, unknown> | null } | null
  owner?: { __typename?: string; address?: { address?: string } } | null
} | null

function extractOwnerFromValue(value: DFValue): string | null {
  if (value?.__typename === 'MoveObject') {
    const o = value.owner
    if (o?.__typename === 'AddressOwner') return o.address?.address ?? null
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
  console.log('[sync] secret length:', secret?.length, '| env length:', process.env.SYNC_SECRET?.length, '| match:', secret === process.env.SYNC_SECRET)
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

  type CheckpointResult = { checkpoint: { sequenceNumber: number } | null }
  let checkpoint: number

  try {
    const checkpointResult = await withRetry(() =>
      graphql.query<CheckpointResult>({
        query: GET_LATEST_CHECKPOINT_QUERY,
        variables: {},
      })
    )
    const c = checkpointResult.data?.checkpoint?.sequenceNumber
    if (!c) throw new Error('Could not fetch latest checkpoint')
    checkpoint = c
    console.log('[bootstrap] checkpoint:', checkpoint)
  } catch (err) {
    console.error('[bootstrap] failed to get checkpoint:', err)
    return NextResponse.json({ error: 'Failed to get checkpoint' }, { status: 500 })
  }

  for (let page = 0; page < MAX_PAGES_PER_INVOCATION; page++) {
    if (Date.now() - startTime > 50_000) break

    type DFNode = {
      address: string
      contents: { json: Record<string, unknown> | null } | null
      value: DFValue
    }

    type BootstrapResult = {
      address: {
        addressAt: {
          dynamicFields: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
            nodes: DFNode[]
          }
        } | null
      } | null
    }

    let result: { data?: BootstrapResult }
    try {
      result = await withRetry(() =>
        graphql.query<BootstrapResult>({
          query: BOOTSTRAP_QUERY,
          variables: {
            registryId: SUINS_OBJECTS.REGISTRY_TABLE,
            checkpoint: checkpoint,
            first: DYNAMIC_FIELDS_PAGE_SIZE,
            after: cursor ?? undefined,
          },
        })
      )
    } catch (err) {
      console.error('Bootstrap GraphQL query failed:', err)
      break
    }

    const fields = result.data?.address?.addressAt?.dynamicFields
    console.log('[bootstrap] nodes:', fields?.nodes?.length ?? 'null', '| hasNextPage:', fields?.pageInfo?.hasNextPage, '| errors:', JSON.stringify((result as Record<string, unknown>).errors ?? null))

    if (!fields?.nodes?.length) { bootstrapComplete = true; break }

    // TEMP: log first node raw data to inspect shape
    if (totalThisCall === 0 && fields.nodes.length > 0) {
      console.log('[bootstrap] first node sample:', JSON.stringify(fields.nodes[0], null, 2))
    }

    const rows = fields.nodes.map((node) => {
      const contentJson = node.contents?.json
      if (!contentJson) return null

      // contentJson shape: { id, name: { labels: [...] }, value: { nft_id, expiration_timestamp_ms, target_address } }
      // Pass contentJson directly — the parser now reads json.name.labels and json.value.expiration_timestamp_ms
      const ownerAddress = extractOwnerFromValue(node.value)

      return parseDomainFromJson(node.address, contentJson, ownerAddress)
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
    type NameRecordResult = {
      nameRecord: {
        name: string
        expirationTimestamp: string | null
        nftId: string | null
        targetAddress: string | null
      } | null
    }

    const NAME_RECORD_QUERY = `
      query GetNameRecord($name: String!) {
        nameRecord(name: $name) {
          name
          expirationTimestamp
          nftId
          targetAddress
        }
      }
    `

    const result = await withRetry(() =>
      graphql.query<NameRecordResult>({
        query: NAME_RECORD_QUERY,
        variables: { name: domainName },
      })
    )

    const record = result.data?.nameRecord
    if (!record) return null

    const labels = nameToLabels(domainName)
    const label = labels[labels.length - 1].toLowerCase()
    const labelLength = label.length

    const expiryMs = parseExpiryMs(record.expirationTimestamp)
    const gracePeriodEndMs = computeGracePeriodEnd(expiryMs)
    const domainStatus: DomainStatus = computeDomainStatus(expiryMs, gracePeriodEndMs)

    const labelType: LabelType =
      /^\d+$/.test(label) ? 'numeric' :
      /^[a-z]+$/.test(label) ? 'alpha' :
      /\p{Emoji_Presentation}/u.test(label) ? 'emoji' :
      'mixed'

    let ownerAddress: string | null = null
    if (record.nftId) {
      type NftResult = {
        object: {
          owner: {
            __typename: string
            address?: { address: string }
          } | null
        } | null
      }

      const NFT_OWNER_QUERY = `
        query GetNftOwner($id: SuiAddress!) {
          object(address: $id) {
            owner {
              __typename
              ... on AddressOwner { address { address } }
            }
          }
        }
      `
      try {
        const nftResult = await withRetry(() =>
          graphql.query<NftResult>({
            query: NFT_OWNER_QUERY,
            variables: { id: record.nftId },
          })
        )
        const ownerField = nftResult.data?.object?.owner
        if (ownerField?.__typename === 'AddressOwner') {
          ownerAddress = ownerField.address?.address ?? null
        }
      } catch {
        // owner lookup is best-effort
      }
    }

    return {
      object_id: record.nftId ?? domainName,
      name: domainName,
      label,
      label_length: labelLength,
      label_type: labelType,
      nft_id: record.nftId,
      target_address: record.targetAddress,
      owner_address: ownerAddress,
      expiry_timestamp_ms: expiryMs,
      grace_period_end_ms: gracePeriodEndMs,
      domain_status: domainStatus,
      updated_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error('fetchDomainByName failed:', err)
    return null
  }
}

export const GET = POST
