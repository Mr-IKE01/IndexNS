'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to Postgres changes on the suins_domains table via Supabase Realtime.
 * Calls `onChange` (debounced) whenever any row is inserted or updated — the sync
 * pipeline runs every few minutes, so we don't need per-row granularity, just a
 * signal that "something changed, maybe refetch."
 */
export function useRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('suins_domains_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suins_domains' },
        () => {
          // Debounce — sync writes many rows at once, avoid refetch storms
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            onChangeRef.current()
          }, 2000)
        },
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [])
  }
