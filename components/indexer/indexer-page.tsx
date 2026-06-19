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
  initialTotal:   number
  syncState:      Pick<SyncState, 'bootstrap_complete' | 'total_indexed' | 'last_synced_at'> | null
}

export function IndexerPage({ initialDomains, initialTotal, syncState }: IndexerPageProps) {
  const [filters, setFilters]       = useState<FilterParams>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')

  useVisitSync()

  // Debounce search → filters.search
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput, page: 1 })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { domains, total, loading, error, refetch } = useDomains(filters, {
    initialDomains: filters.tab === 'active' ? initialDomains : [],
    initialTotal:   filters.tab === 'active' ? initialTotal   : 0,
  })

  useRealtime(refetch)

  const handleTabChange = useCallback((tab: DomainStatus) => {
    setFilters({ ...DEFAULT_FILTERS, tab, window: tab === 'expired' ? '7d' : 'all' })
    setSearchInput('')
  }, [])

  const handleFilterChange = useCallback(
    (key: keyof FilterParams, value: FilterParams[keyof FilterParams]) =>
      setFilters(f => ({ ...f, [key]: value, page: 1 })),
    [],
  )

  const handlePageChange = useCallback((page: number) => {
    setFilters(f => ({ ...f, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const bootstrapInProgress = syncState && !syncState.bootstrap_complete
  const progressPct = syncState?.total_indexed
    ? Math.min(100, Math.round((syncState.total_indexed / 300_000) * 100))
    : 0
  const lastSyncedLabel = syncState?.last_synced_at
    ? formatTimeRemaining(new Date(syncState.last_synced_at).getTime())
    : null

  return (
    <div className="min-h-screen bg-[#0d0a17] text-zinc-100">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 h-14 flex items-center border-b border-white/[0.06] bg-[#0d0a17]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto w-full px-5 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-400/[0.10] border border-teal-400/20 text-teal-300 text-[11px] font-black tracking-tight">
              .NS
            </div>
            <span className="font-semibold text-[14px] text-zinc-100 tracking-tight">SuiNS Indexer</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-600">mainnet</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {syncState && (
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-600 tabular-nums">
                  {syncState.total_indexed?.toLocaleString()}
                </span>
                <span className="text-[11px] text-zinc-700">indexed</span>
              </div>
            )}
            {lastSyncedLabel && (
              <span className="hidden md:block text-[11px] font-mono text-zinc-700">
                synced {lastSyncedLabel}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors px-2.5 py-1.5 rounded-md hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Bootstrap banner ────────────────────────────────────────── */}
      {bootstrapInProgress && (
        <div className="border-b border-violet-400/[0.15] bg-violet-400/[0.05] px-5 py-3">
          <div className="max-w-6xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[12px] text-violet-300">
                  Bootstrap in progress —{' '}
                  <span className="font-mono font-semibold text-white">
                    {syncState.total_indexed?.toLocaleString()}
                  </span>
                  {' '}of ~300,000 domains indexed
                </span>
              </div>
              <span className="text-[11px] font-mono text-violet-400">{progressPct}%</span>
            </div>
            <div className="h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-400 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto">
        <FilterBar
          filters={{ ...filters, search: searchInput }}
          onTabChange={handleTabChange}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearchInput}
          total={total}
        />

        <DomainList
          domains={domains}
          loading={loading}
          error={error}
        />

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
