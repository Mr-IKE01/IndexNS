'use client'

import { DomainRow } from './domain-row'
import type { SuinsDomain } from '@/types/domain'

// Desktop table header
function TableHeader() {
  return (
    <div className="hidden md:grid grid-cols-[1fr_160px_140px_220px] gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-950/80 sticky top-[var(--filter-bar-height)] z-[5]">
      <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider">Domain</span>
      <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider">Countdown</span>
      <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider text-right">Date</span>
      <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider text-right">Exact UTC</span>
    </div>
  )
}

// Loading skeleton
function DomainSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="hidden md:grid grid-cols-[1fr_160px_140px_220px] gap-4 px-4 py-3 border-b border-zinc-800/60"
        >
          <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-1.5 bg-zinc-800 rounded-full w-full animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse" />
          </div>
          <div className="h-4 bg-zinc-800 rounded w-16 ml-auto animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-40 ml-auto animate-pulse" />
        </div>
      ))}
      {/* Mobile skeletons */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`m${i}`}
          className="md:hidden mx-3 mb-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 animate-pulse"
        >
          <div className="h-4 bg-zinc-800 rounded w-28" />
          <div className="h-1.5 bg-zinc-800 rounded-full w-full" />
          <div className="h-4 bg-zinc-800 rounded w-24" />
          <div className="h-8 bg-zinc-950/60 rounded-lg w-full" />
        </div>
      ))}
    </div>
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
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="text-zinc-500 text-sm">{error}</div>
        <div className="text-xs text-zinc-700">Check your connection and try refreshing</div>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <TableHeader />
        <DomainSkeleton count={10} />
      </>
    )
  }

  if (!domains.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <div className="text-zinc-500 text-sm">No domains found</div>
        <div className="text-xs text-zinc-700">Try adjusting your filters</div>
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
