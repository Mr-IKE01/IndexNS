import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'

const STALE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

export async function POST(request: Request) {
  // Auth — session cookie required
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  if (!session?.value || !(await verifySession(session.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: state } = await supabase
    .from('sync_state')
    .select('last_visit_sync_at')
    .eq('id', 1)
    .single()

  const lastVisit = state?.last_visit_sync_at
    ? new Date(state.last_visit_sync_at).getTime()
    : 0

  const isStale = Date.now() - lastVisit > STALE_THRESHOLD_MS

  if (!isStale) {
    return NextResponse.json({ triggered: false, reason: 'not stale' })
  }

  // Mark as triggered immediately to prevent concurrent requests from
  // double-triggering while the fire-and-forget sync runs
  await supabase
    .from('sync_state')
    .update({ last_visit_sync_at: new Date().toISOString() })
    .eq('id', 1)

  // Fire-and-forget — don't await, don't block the response
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const syncSecret = process.env.SYNC_SECRET

  if (appUrl && syncSecret) {
    fetch(`${appUrl}/api/sync`, {
      method: 'POST',
      headers: { 'x-sync-secret': syncSecret },
    }).catch((err) => {
      console.error('[visit-sync] fire-and-forget sync failed:', err)
    })
  }

  return NextResponse.json({ triggered: true })
      }
