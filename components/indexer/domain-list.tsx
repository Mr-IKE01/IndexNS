'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

function SkeletonRow() {
  return (
    <div
      className="mb-1.5 rounded-xl animate-pulse"
      style={{ background: '#151228', border: '1px solid #2d2552' }}
    >
      <div className="flex gap-3 px-4 py-3.5">
        <div className="w-[20px] shrink-0 pt-1">
          <div className="h-2.5 w-4 rounded ml-auto" style={{ background: '#2d2552' }} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 rounded" style={{ background: '#2d2552' }} />
            <div className="h-4 w-8 rounded" style={{ background: '#252040' }} />
            <div className="h-3.5 w-3.5 rounded" style={{ background: '#252040' }} />
            <div className="h-3 w-px mx-1" style={{ background: '#2d2552' }} />
            <div className="h-3 w-20 rounded" style={{ background: '#252040' }} />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5 min-w-[160px]">
              <div className="h-[3px] w-full rounded-full" style={{ background: '#2d2552' }} />
              <div className="h-4 w-28 rounded" style={{ background: '#2d2552' }} />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-44 rounded ml-auto" style={{ background: '#252040' }} />
              <div className="h-3 w-40 rounded ml-auto" style={{ background: '#252040' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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

  if (loading) {
    return (
      <div className="px-5 pt-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (!domains.length) {
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
      {/* Result count header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#3d3a52' }}>
          Domains
        </span>
        <span className="font-mono text-[10px]" style={{ color: '#3d3a52' }}>
          {domains.length} shown
        </span>
      </div>

      {domains.map((domain, i) => (
        <DomainRow key={domain.id} domain={domain} index={i + 1} />
      ))}
    </div>
  )
}
