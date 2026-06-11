import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('sync_state')
      .select('total_indexed, bootstrap_complete, last_synced_at, bootstrap_cursor')
      .eq('id', 1)
      .single()

    if (error) throw error

    const ESTIMATED_TOTAL = 300_000
    const progressPct = data.total_indexed
      ? Math.min(100, Math.round((data.total_indexed / ESTIMATED_TOTAL) * 100))
      : 0

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      sync: {
        bootstrap_complete: data.bootstrap_complete,
        total_indexed: data.total_indexed,
        estimated_total: ESTIMATED_TOTAL,
        progress_pct: progressPct,
        last_synced_at: data.last_synced_at,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'failed', message: String(err) },
      { status: 500 }
    )
  }
}
