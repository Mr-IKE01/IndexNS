'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

function TableHeader() {
  return (
    <div
      className="hidden md:grid gap-4 px-4 pb-2.5"
      style={{ gridTemplateColumns: '44px 1fr 170px 120px 220px' }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-center"
        style={{ color: 'rgba(255,255,255,0.25)' }}>
        #
      </span>
      {[
        { label: 'Domain',    align: 'text-left'  },
        { label: 'Countdown', align: 'text-left'  },
        { label: 'Date',      align: 'text-right' },
        { label: 'Exact UTC', align: 'text-right' },
      ].map(({ label, align }) => (
        <span
          key={label}
          className={`text-[10px] font-semibold uppercase tracking-widest ${align}`}
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function SkeletonRow({ index }: { index: number }) {
  const widths = ['w-32', 'w-24', 'w-28', 'w-20', 'w-36']
  const w = widths[index % widths.length]

  return (
    <>
      {/* Desktop skeleton */}
      <div
        className="hidden md:grid gap-4 items-center px-4 py-4 mb-2 rounded-xl animate-pulse"
        style={{
          gridTemplateColumns: '44px 1fr 170px 120px 220px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="h-3 w-5 rounded mx-auto" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="space-y-2">
          <div className={`h-3.5 rounded ${w}`} style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-2.5 rounded w-20" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="space-y-2">
          <div className="h-[3px] rounded-full w-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-3.5 rounded w-28" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="h-3.5 rounded w-16 ml-auto" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-3 rounded w-40" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-3 rounded w-36" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>

      {/* Mobile skeleton */}
      <div
        className="md:hidden mb-2 rounded-xl p-4 space-y-3 animate-pulse"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className={`h-4 rounded ${w}`} style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-[3px] rounded-full w-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 rounded w-24" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-12 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }} />
      </div>
    </>
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
        <p className="text-xs text-zinc-600">Check your connection and try refreshing</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-5 pt-4">
        <TableHeader />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    )
  }

  if (!domains.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-3xl">🔍</span>
        <p className="text-sm text-zinc-500">No domains match your filters</p>
        <p className="text-xs text-zinc-600">Try adjusting the length, type, or window</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4">
      <TableHeader />
      <div>
        {domains.map((domain, i) => (
          <DomainRow key={domain.id} domain={domain} index={i + 1} />
        ))}
      </div>
    </div>
  )
}
