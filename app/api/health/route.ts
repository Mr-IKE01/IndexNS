import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('sync_state')
      .select('total_indexed, bootstrap_complete, last_synced_at')
      .eq('id', 1)
      .single()

    if (error) throw error

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      sync: {
        total_indexed: data.total_indexed,
        bootstrap_complete: data.bootstrap_complete,
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
