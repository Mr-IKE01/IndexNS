'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut } from 'lucide-react'
import { FilterBar } from './filter-bar'
import { DomainList } from './domain-list'
import { Pagination } from './pagination'
import { useDomains } from '@/hooks/use-domains'
import { useVisitSync } from '@/hooks/use-visit-sync'
import { useRealtime } from '@/hooks/use-realtime'
import { formatTimeRemaining } from '@/lib/sui/time'
import type { FilterParams, DomainStatus, SuinsDomain, SyncState } from '@/types/domain'

const DEFAULT_FILTERS: FilterParams = {
  tab:    'active',
  length: 'all',
  type:   'all',
  window: 'all',
  sort:   'expiry_asc',
  page:   1,
  limit:  50,
  search: '',
}

interface IndexerPageProps {
  initialDomains: SuinsDomain[]
  initialTotal: number
  syncState: Pick<SyncState, 'bootstrap_complete' | 'total_indexed' | 'last_synced_at'> | null
}

export function IndexerPage({
  initialDomains,
  initialTotal,
  syncState,
}: IndexerPageProps) {
  const [filters, setFilters] = useState<FilterParams>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')

  // Fire a background visit-sync ping once on mount
  useVisitSync()

  // Debounce search input → filters.search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { domains, total, loading, error, refetch } = useDomains(filters, {
    initialDomains: filters.tab === 'active' ? initialDomains : [],
    initialTotal:   filters.tab === 'active' ? initialTotal   : 0,
  })

  // Refetch when Realtime detects any change to suins_domains
  useRealtime(refetch)

  // When tab changes: reset ALL filters + go to page 1
  const handleTabChange = useCallback((tab: DomainStatus) => {
    setFilters({
      ...DEFAULT_FILTERS,
      tab,
      window: tab === 'expired' ? '7d' : 'all',
    })
    setSearchInput('')
  }, [])

  // When a non-tab, non-search filter changes: reset page to 1
  const handleFilterChange = useCallback(
    (key: keyof FilterParams, value: FilterParams[keyof FilterParams]) => {
      setFilters((f) => ({ ...f, [key]: value, page: 1 }))
    },
    [],
  )

  const handlePageChange = useCallback((page: number) => {
    setFilters((f) => ({ ...f, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const bootstrapInProgress =
    syncState && !syncState.bootstrap_complete

  const lastSyncedLabel = syncState?.last_synced_at
    ? formatTimeRemaining(new Date(syncState.last_synced_at).getTime())
    : null

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⛓️</span>
            <span className="font-semibold text-white tracking-tight">SuiNS Indexer</span>
            <span className="hidden sm:inline text-xs text-zinc-600 font-mono">
              mainnet
            </span>
          </div>
          <div className="flex items-center gap-3">
            {syncState && (
              <span className="hidden sm:inline text-xs text-zinc-600 tabular-nums">
                {syncState.total_indexed?.toLocaleString()} indexed
              </span>
            )}
            {lastSyncedLabel && (
              <span className="hidden md:inline text-xs text-zinc-700" title="Last sync">
                synced {lastSyncedLabel}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-md hover:bg-zinc-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Bootstrap progress banner ────────────────────────────────── */}
      {bootstrapInProgress && (
        <div className="bg-indigo-950/50 border-b border-indigo-800/40 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <p className="text-xs text-indigo-300">
              Bootstrap in progress —{' '}
              <span className="font-mono font-medium text-indigo-200">
                {syncState.total_indexed?.toLocaleString()}
              </span>{' '}
              domains indexed so far. Data may be incomplete until bootstrap completes.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto">

        {/* Filter bar */}
        <FilterBar
          filters={{ ...filters, search: searchInput }}
          onTabChange={handleTabChange}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearchInput}
          total={total}
        />

        {/* Domain list */}
        <DomainList
          domains={domains}
          loading={loading}
          error={error}
        />

        {/* Pagination */}
        <Pagination
          page={filters.page}
          total={total}
          limit={filters.limit}
          hasNextPage={
            total !== null
              ? filters.page * filters.limit < total
              : domains.length === filters.limit
          }
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  )
}
