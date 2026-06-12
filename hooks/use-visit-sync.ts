'use client'

import { useEffect, useRef } from 'react'

/**
 * Fires once per page mount — pings /api/visit-sync, which itself decides
 * whether enough time has passed (>1hr) to trigger an actual sync.
 * This means an active visitor occasionally "wakes up" the sync pipeline
 * between CF Worker cron ticks, but never spams it.
 */
export function useVisitSync() {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    fetch('/api/visit-sync', { method: 'POST' }).catch(() => {
      // Silent failure — this is a best-effort background ping
    })
  }, [])
}
