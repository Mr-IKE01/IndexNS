export type DomainStatus = 'active' | 'grace' | 'expired'
export type LabelType = 'numeric' | 'alpha' | 'mixed' | 'emoji'

export interface SuinsDomain {
  id: number
  object_id: string
  name: string
  label: string
  label_length: number
  label_type: LabelType
  nft_id: string | null
  target_address: string | null
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

export interface DomainsResponse {
  data: SuinsDomain[]
  nextCursor: string | null
  total: number
}

export interface FilterParams {
  tab: 'active' | 'grace' | 'expired'
  length?: number | 'all'
  type?: LabelType | 'all'
  window?: 'today' | '7d' | '14d' | '30d' | 'all'
  sort?: 'expiry_asc' | 'expiry_desc' | 'grace_asc' | 'name_asc'
  cursor?: string
  limit?: number
  search?: string
}
