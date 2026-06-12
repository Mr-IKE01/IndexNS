import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import type { DomainStatus } from '@/types/domain'

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  if (!session?.value || !(await verifySession(session.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim().toLowerCase()
  const tab = (sp.get('tab') ?? 'all') as DomainStatus | 'all'
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)))

  // Minimum query length
  if (q.length < 1) {
    return NextResponse.json({ data: [], query: q })
  }

  const supabase = createServerClient()

  let query = supabase
    .from('suins_domains')
    .select(
      'name, label, label_length, label_type, nft_id, ' +
        'expiry_timestamp_ms, grace_period_end_ms, domain_status',
    )
    .ilike('label', `${q}%`)

  // Status filter — skip if 'all'
  if (tab !== 'all') {
    const validStatuses: DomainStatus[] = ['active', 'grace', 'expired']
    if (validStatuses.includes(tab as DomainStatus)) {
      query = query.eq('domain_status', tab)
    }
  }

  const { data, error } = await query
    .order('label_length', { ascending: true }) // shortest first
    .order('label', { ascending: true }) // then alphabetical
    .limit(limit)

  if (error) {
    console.error('[/api/search] Supabase error:', error.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], query: q })
}
