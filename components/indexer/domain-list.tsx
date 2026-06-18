'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

function TableHeader() {
  return (
    <div
      className="hidden md:grid px-4 py-2.5 gap-3"
      style={{
        gridTemplateColumns: '1fr 160px 130px 200px',
        borderBottom: '1px solid oklch(0.22 0.05 285)',
        background: 'oklch(0.15 0.04 285)',
      }}
    >
      {['Domain', 'Countdown', 'Date', 'Exact UTC'].map((h, i) => (
        <span
          key={h}
          className={`text-[10px] font-semibold uppercase tracking-widest ${i >= 2 ? 'text-right' : ''}`}
          style={{ color: 'oklch(0.40 0.05 285)' }}
        >
          {h}
        </span>
      ))}
    </div>
  )
}

function SkeletonRow() {
  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:grid px-4 py-3 gap-3"
        style={{
          gridTemplateColumns: '1fr 160px 130px 200px',
          borderBottom: '1px solid oklch(0.20 0.05 285)',
        }}
      >
        <div className="space-y-2">
          <div className="h-3.5 rounded-md w-36 animate-pulse" style={{ background: 'oklch(0.22 0.05 285)' }} />
          <div className="h-2.5 rounded-md w-24 animate-pulse" style={{ background: 'oklch(0.20 0.05 285)' }} />
        </div>
        <div className="space-y-2 pt-0.5">
          <div className="h-1.5 rounded-full w-full animate-pulse" style={{ background: 'oklch(0.22 0.05 285)' }} />
          <div className="h-3.5 rounded-md w-28 animate-pulse" style={{ background: 'oklch(0.20 0.05 285)' }} />
        </div>
        <div className="h-3.5 rounded-md w-20 ml-auto mt-0.5 animate-pulse" style={{ background: 'oklch(0.22 0.05 285)' }} />
        <div className="space-y-1.5 items-end flex flex-col pt-0.5">
          <div className="h-3 rounded-md w-40 animate-pulse" style={{ background: 'oklch(0.22 0.05 285)' }} />
          <div className="h-2.5 rounded-md w-36 animate-pulse" style={{ background: 'oklch(0.20 0.05 285)' }} />
        </div>
      </div>

      {/* Mobile */}
      <div
        className="md:hidden mx-3 mb-2 rounded-xl p-3.5 space-y-2.5 animate-pulse"
        style={{ background: 'oklch(0.17 0.04 285)', border: '1px solid oklch(0.22 0.05 285)' }}
      >
        <div className="h-4 rounded-md w-32" style={{ background: 'oklch(0.22 0.05 285)' }} />
        <div className="h-1 rounded-full w-full" style={{ background: 'oklch(0.22 0.05 285)' }} />
        <div className="h-4 rounded-md w-24" style={{ background: 'oklch(0.20 0.05 285)' }} />
        <div className="h-12 rounded-lg w-full" style={{ background: 'oklch(0.15 0.04 285)' }} />
      </div>
    </>
  )
}

interface DomainListProps {
  domains: SuinsDomain[]
  loading: boolean
  error: string | null
}

export function DomainList({ domains, loading, error }: DomainListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{ background: 'oklch(0.60 0.22 25 / 0.12)', border: '1px solid oklch(0.60 0.22 25 / 0.3)' }}
        >
          ⚠️
        </div>
        <p className="text-sm" style={{ color: 'oklch(0.65 0.10 25)' }}>{error}</p>
        <p className="text-xs" style={{ color: 'oklch(0.40 0.05 285)' }}>Check your connection and try refreshing</p>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <TableHeader />
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
      </>
    )
  }

  if (!domains.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{ background: 'oklch(0.20 0.05 285)', border: '1px solid oklch(0.25 0.06 285)' }}
        >
          🔍
        </div>
        <p className="text-sm" style={{ color: 'oklch(0.55 0.05 285)' }}>No domains found</p>
        <p className="text-xs" style={{ color: 'oklch(0.40 0.05 285)' }}>Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <>
      <TableHeader />
      <div>
        {domains.map((domain) => (
          <DomainRow key={domain.id} domain={domain} />
        ))}
      </div>
    </>
  )
}
