'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FilterParams, SuinsDomain, DomainsResponse } from '@/types/domain'

interface UseDomainsOptions {
  initialDomains?: SuinsDomain[]
  initialTotal?: number
}

interface UseDomainsResult {
  domains: SuinsDomain[]
  total: number | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDomains(
  filters: FilterParams,
  { initialDomains = [], initialTotal = 0 }: UseDomainsOptions = {},
): UseDomainsResult {
  const [domains, setDomains] = useState<SuinsDomain[]>(initialDomains)
  const [total, setTotal] = useState<number | null>(initialTotal || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track whether initial data was used (skip first fetch if so)
  const isFirstRender = useRef(true)

  const fetchDomains = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('tab', filters.tab)
    params.set('page', String(filters.page))
    params.set('limit', String(filters.limit))
    if (filters.length !== 'all') params.set('length', String(filters.length))
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.window !== 'all') params.set('window', filters.window)
    if (filters.sort !== 'expiry_asc') params.set('sort', filters.sort)
    if (filters.search.trim()) params.set('search', filters.search.trim())

    try {
      const res = await fetch(`/api/domains?${params.toString()}`)

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data: DomainsResponse = await res.json()
      setDomains(data.data)
      // Only update total when server returns it (page 1 only)
      if (data.total !== null) setTotal(data.total)
    } catch {
      setError('Failed to load domains. Check your connection.')
      setDomains([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    // Skip the very first fetch if initial server data was provided and
    // we are on page 1 with default active tab
    if (
      isFirstRender.current &&
      initialDomains.length > 0 &&
      filters.tab === 'active' &&
      filters.page === 1
    ) {
      isFirstRender.current = false
      return
    }
    isFirstRender.current = false
    fetchDomains()
  }, [fetchDomains]) // eslint-disable-line react-hooks/exhaustive-deps

  return { domains, total, loading, error, refetch: fetchDomains }
  }
