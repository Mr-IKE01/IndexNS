import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { IndexerPage } from '@/components/indexer/indexer-page'
import type { SuinsDomain, SyncState } from '@/types/domain'

export default async function Home() {
  // Auth gate
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  if (!session?.value || !(await verifySession(session.value))) {
    redirect('/login')
  }

  const supabase = createServerClient()

  // Initial domain fetch (active tab, first 50, soonest expiry first)
  const { data: initialDomains, count: initialTotal } = await supabase
    .from('suins_domains')
    .select(
      'id, name, label, label_length, label_type, nft_id, target_address, ' +
        'expiry_timestamp_ms, grace_period_end_ms, domain_status',
      { count: 'exact' },
    )
    .eq('domain_status', 'active')
    .order('expiry_timestamp_ms', { ascending: true })
    .order('id', { ascending: true })
    .range(0, 49)

  // Sync state for progress banner
  const { data: syncState } = await supabase
    .from('sync_state')
    .select('bootstrap_complete, total_indexed, last_synced_at')
    .eq('id', 1)
    .single()

  return (
    <IndexerPage
      initialDomains={(initialDomains ?? []) as SuinsDomain[]}
      initialTotal={initialTotal ?? 0}
      syncState={syncState as Pick<SyncState, 'bootstrap_complete' | 'total_indexed' | 'last_synced_at'> | null}
    />
  )
}
