'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut, Zap } from 'lucide-react'
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

  useVisitSync()

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

  useRealtime(refetch)

  const handleTabChange = useCallback((tab: DomainStatus) => {
    setFilters({ ...DEFAULT_FILTERS, tab, window: tab === 'expired' ? '7d' : 'all' })
    setSearchInput('')
  }, [])

  const handleFilterChange = useCallback(
    (key: keyof FilterParams, value: FilterParams[keyof FilterParams]) => {
      setFilters((f) => ({ ...f, [key]: value, page: 1 }))
    }, [],
  )

  const handlePageChange = useCallback((page: number) => {
    setFilters((f) => ({ ...f, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const bootstrapInProgress = syncState && !syncState.bootstrap_complete

  const lastSyncedLabel = syncState?.last_synced_at
    ? formatTimeRemaining(new Date(syncState.last_synced_at).getTime())
    : null

  const progressPct = syncState?.total_indexed
    ? Math.min(100, Math.round((syncState.total_indexed / 300_000) * 100))
    : 0

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.13 0.04 285)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md"
        style={{
          borderBottom: '1px solid oklch(0.22 0.05 285)',
          background: 'oklch(0.13 0.04 285 / 0.90)',
        }}
      >
        {/* Iridescent top line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #2dd4bf55 30%, #818cf855 60%, transparent 100%)' }}
        />

        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left — brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm tracking-tighter"
              style={{
                background: 'oklch(0.18 0.06 285)',
                border: '1px solid oklch(0.30 0.10 285)',
                color: '#2dd4bf',
              }}
            >
              .NS
            </div>
            <span className="font-semibold text-white tracking-tight">SuiNS Indexer</span>

            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full pulse-glow"
                style={{ color: '#22c55e', background: '#22c55e' }}
              />
              <span className="text-xs font-mono" style={{ color: 'oklch(0.45 0.05 285)' }}>
                mainnet
              </span>
            </div>
          </div>

          {/* Right — stats + logout */}
          <div className="flex items-center gap-3">
            {syncState && (
              <div className="hidden sm:flex items-center gap-2">
                <Zap className="w-3 h-3" style={{ color: '#2dd4bf' }} />
                <span className="text-xs font-mono tabular-nums" style={{ color: 'oklch(0.55 0.05 285)' }}>
                  {syncState.total_indexed?.toLocaleString()}
                </span>
              </div>
            )}
            {lastSyncedLabel && (
              <span className="hidden md:inline text-xs font-mono" style={{ color: 'oklch(0.38 0.05 285)' }}>
                synced {lastSyncedLabel}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-all"
              style={{
                color: 'oklch(0.50 0.05 285)',
                border: '1px solid oklch(0.22 0.05 285)',
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Bootstrap banner ────────────────────────────────────────── */}
      {bootstrapInProgress && (
        <div
          className="px-4 py-3"
          style={{
            background: 'linear-gradient(90deg, oklch(0.60 0.18 285 / 0.08), oklch(0.72 0.18 195 / 0.08))',
            borderBottom: '1px solid oklch(0.60 0.18 285 / 0.2)',
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#818cf8' }} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs" style={{ color: '#818cf8' }}>
                  Bootstrap in progress —{' '}
                  <span className="font-mono font-semibold text-white">
                    {syncState.total_indexed?.toLocaleString()}
                  </span>{' '}
                  of ~300,000 domains indexed
                </p>
                <span className="text-xs font-mono" style={{ color: '#818cf8' }}>
                  {progressPct}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.22 0.05 285)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #2dd4bf, #818cf8)',
                  }}
                />
              </div>
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
