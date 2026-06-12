import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import type { DomainStatus, LabelType } from '@/types/domain'

// Window durations in milliseconds
const WINDOW_MS: Record<string, number> = {
  today: 1 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

// Which column to sort by for each sort option
const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  expiry_asc: { column: 'expiry_timestamp_ms', ascending: true },
  expiry_desc: { column: 'expiry_timestamp_ms', ascending: false },
  grace_asc: { column: 'grace_period_end_ms', ascending: true },
  name_asc: { column: 'name', ascending: true },
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  if (!session?.value || !(await verifySession(session.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse query params ────────────────────────────────────────────────────
  const sp = request.nextUrl.searchParams

  const tab = (sp.get('tab') ?? 'active') as DomainStatus
  const length = sp.get('length') ?? 'all'
  const type = (sp.get('type') ?? 'all') as LabelType | 'all'
  const window = sp.get('window') ?? 'all'
  const sort = sp.get('sort') ?? 'expiry_asc'
  const search = sp.get('search') ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(sp.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit
  const now = Date.now()

  // Validate tab
  if (!['active', 'grace', 'expired'].includes(tab)) {
    return NextResponse.json({ error: 'Invalid tab value' }, { status: 400 })
  }

  const supabase = createServerClient()

  // ── Build query ───────────────────────────────────────────────────────────
  // Only fetch count on first page — returned to client once and cached
  type QueryOptions = { count: 'exact' | undefined }
  const countOption: QueryOptions = { count: page === 1 ? 'exact' : undefined }

  let query = supabase
    .from('suins_domains')
    .select(
      'id, name, label, label_length, label_type, nft_id, target_address, ' +
        'expiry_timestamp_ms, grace_period_end_ms, domain_status',
      countOption,
    )
    .eq('domain_status', tab)

  // ── Length filter ─────────────────────────────────────────────────────────
  if (length !== 'all') {
    if (length === '8plus') {
      query = query.gte('label_length', 8)
    } else {
      const len = parseInt(length, 10)
      if (!isNaN(len) && len >= 1 && len <= 50) {
        query = query.eq('label_length', len)
      }
    }
  }

  // ── Type filter ───────────────────────────────────────────────────────────
  if (type !== 'all') {
    const validTypes: LabelType[] = ['numeric', 'alpha', 'mixed', 'emoji']
    if (validTypes.includes(type as LabelType)) {
      query = query.eq('label_type', type)
    }
  }

  // ── Window filter ─────────────────────────────────────────────────────────
  if (window !== 'all' && WINDOW_MS[window]) {
    const windowMs = WINDOW_MS[window]

    if (tab === 'active') {
      // Domains expiring within the window
      query = query.gte('expiry_timestamp_ms', now).lte('expiry_timestamp_ms', now + windowMs)
    } else if (tab === 'grace') {
      // Grace periods ending within the window
      query = query.gte('grace_period_end_ms', now).lte('grace_period_end_ms', now + windowMs)
    } else if (tab === 'expired') {
      // Recently expired (grace period ended within last `window`)
      query = query.gte('grace_period_end_ms', now - windowMs).lte('grace_period_end_ms', now)
    }
  }

  // ── Search filter ─────────────────────────────────────────────────────────
  // Prefix match on label using the idx_label_prefix index
  const trimmedSearch = search.trim().toLowerCase()
  if (trimmedSearch.length > 0) {
    query = query.ilike('label', `${trimmedSearch}%`)
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortConfig = SORT_MAP[sort] ?? SORT_MAP.expiry_asc
  query = query
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .order('id', { ascending: true }) // stable secondary sort

  // ── Pagination ────────────────────────────────────────────────────────────
  query = query.range(offset, offset + limit - 1)

  // ── Execute ───────────────────────────────────────────────────────────────
  const { data, error, count } = await query

  if (error) {
    console.error('[/api/domains] Supabase error:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const total = count ?? null
  const hasNextPage =
    total !== null ? offset + limit < total : (data?.length ?? 0) === limit

  return NextResponse.json({
    data: data ?? [],
    page,
    limit,
    total,
    hasNextPage,
    nextPage: hasNextPage ? page + 1 : null,
  })
}
