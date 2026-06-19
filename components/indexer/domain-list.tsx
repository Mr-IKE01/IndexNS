'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

function TableHeader() {
  return (
    <div className="hidden md:grid grid-cols-[1fr_170px_120px_220px] gap-4 px-5 py-2.5 border-b border-white/[0.05] bg-white/[0.01]">
      {[
        { label: 'Domain',     align: 'text-left'  },
        { label: 'Countdown',  align: 'text-left'  },
        { label: 'Date',       align: 'text-right' },
        { label: 'Exact UTC',  align: 'text-right' },
      ].map(({ label, align }) => (
        <span key={label} className={`text-[10px] font-semibold uppercase tracking-widest text-zinc-600 ${align}`}>
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
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[1fr_170px_120px_220px] gap-4 px-5 py-4 border-b border-white/[0.05]">
        <div className="space-y-2">
          <div className={`h-3.5 rounded bg-white/[0.05] animate-pulse ${w}`} />
          <div className="h-2.5 rounded bg-white/[0.03] animate-pulse w-20" />
        </div>
        <div className="space-y-2 pt-0.5">
          <div className="h-[3px] rounded-full bg-white/[0.05] animate-pulse w-full" />
          <div className="h-3.5 rounded bg-white/[0.05] animate-pulse w-28" />
        </div>
        <div className="h-3.5 rounded bg-white/[0.04] animate-pulse w-16 ml-auto mt-0.5" />
        <div className="flex flex-col items-end gap-1.5 pt-0.5">
          <div className="h-3 rounded bg-white/[0.05] animate-pulse w-40" />
          <div className="h-3 rounded bg-white/[0.03] animate-pulse w-36" />
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden mx-3 mb-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3 animate-pulse">
        <div className={`h-4 rounded bg-white/[0.05] ${w}`} />
        <div className="h-[3px] rounded-full bg-white/[0.05] w-full" />
        <div className="h-4 rounded bg-white/[0.04] w-24" />
        <div className="h-12 rounded-lg bg-black/20 w-full" />
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
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-400">{error}</p>
        <p className="text-xs text-zinc-600">Check your connection and try refreshing</p>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <TableHeader />
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} index={i} />)}
      </>
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
