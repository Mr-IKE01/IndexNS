'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

interface DomainListProps {
  domains: SuinsDomain[]
  loading: boolean
  error:   string | null
}

export function DomainList({ domains, loading, error }: DomainListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-400">{error}</p>
        <p className="text-xs" style={{ color: '#52525b' }}>
          Check your connection and try refreshing
        </p>
      </div>
    )
  }

  // Initial load with no data yet — show skeletons
  if (loading && domains.length === 0) {
    return (
      <div className="px-5 pt-3 pb-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="mb-1.5 rounded-xl animate-pulse"
            style={{ background: '#151228', border: '1px solid #2d2552', height: '82px' }}
          />
        ))}
      </div>
    )
  }

  if (!loading && domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-3xl">🔍</span>
        <p className="text-sm" style={{ color: '#71717a' }}>
          No domains match your filters
        </p>
        <p className="text-xs" style={{ color: '#52525b' }}>
          Try adjusting length, type, or window
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-3 pb-2">
      {/* Subtle refresh indicator — never unmounts the domain rows */}
      {loading && (
        <div
          className="mb-3 h-[2px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full animate-pulse"
            style={{ width: '60%', background: 'linear-gradient(90deg, #2dd4bf, #818cf8)' }}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#3d3a52' }}>
          Domains
        </span>
        <span className="font-mono text-[10px]" style={{ color: '#3d3a52' }}>
          {domains.length} shown
        </span>
      </div>

      {/* Domains stay mounted through loading — timers never reset */}
      {domains.map((domain, i) => (
        <DomainRow key={domain.id} domain={domain} index={i + 1} />
      ))}
    </div>
  )
}
