export type DomainStatus = 'active' | 'grace' | 'expired'
export type LabelType = 'numeric' | 'alpha' | 'mixed' | 'emoji'

export interface SuinsDomain {
  id: number
  object_id: string
  name: string                    // "example.sui"
  label: string                   // "example"
  label_length: number            // 7
  label_type: LabelType
  nft_id: string | null           // SuinsRegistration NFT objectId — used for SuiScan link
  target_address: string | null   // wallet the domain resolves to (DNS-style target)
  owner_address: string | null    // wallet that HOLDS the NFT (actual owner)
  expiry_timestamp_ms: number
  grace_period_end_ms: number
  domain_status: DomainStatus
  created_at: string
  updated_at: string
}

export interface SyncState {
  id: number
  bootstrap_complete: boolean
  bootstrap_cursor: string | null
  last_event_cursor_registered: string | null
  last_event_cursor_renewed: string | null
  last_synced_at: string | null
  last_visit_sync_at: string | null
  total_indexed: number
}

export interface FilterParams {
  tab: DomainStatus
  length: number | '8plus' | 'all'
  type: LabelType | 'all'
  window: 'today' | '7d' | '14d' | '30d' | 'all'
  sort: 'expiry_asc' | 'expiry_desc' | 'grace_asc' | 'name_asc'
  page: number
  limit: number
  search: string
}

export interface DomainsResponse {
  data: SuinsDomain[]
  page: number
  limit: number
  total: number | null       // null on pages > 1 (count only fetched on page 1)
  hasNextPage: boolean
  nextPage: number | null
}

export interface SearchResponse {
  data: Pick<
    SuinsDomain,
    'name' | 'label' | 'label_length' | 'label_type' |
    'nft_id' | 'expiry_timestamp_ms' | 'grace_period_end_ms' | 'domain_status'
  >[]
  query: string
}

export interface HealthResponse {
  status: 'ok' | 'error'
  db: 'connected' | 'failed'
  sync: {
    bootstrap_complete: boolean
    total_indexed: number
    estimated_total: number
    progress_pct: number
    last_synced_at: string | null
  }
  timestamp: string
}
