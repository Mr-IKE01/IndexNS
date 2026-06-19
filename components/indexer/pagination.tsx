'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number | null
  limit: number
  hasNextPage: boolean
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  total,
  limit,
  hasNextPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = total ? Math.ceil(total / limit) : null
  if (!totalPages || totalPages <= 1) return null

  function getPages(): (number | '...')[] {
    if (totalPages === null) return []
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

    const pages: (number | '...')[] = [1]
    if (page > 4) pages.push('...')
    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 3) pages.push('...')
    pages.push(totalPages)

    return pages
  }

  const pages = getPages()
  const navBtn = 'flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500'

  return (
    <div className="flex items-center justify-center gap-1 py-10">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={navBtn}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-8 text-center text-xs text-zinc-600 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-medium transition-colors',
              p === page
                ? 'bg-teal-400/[0.12] text-teal-300 border border-teal-400/25'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        className={navBtn}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="ml-3 text-xs font-mono text-zinc-600 tabular-nums">
        of {totalPages.toLocaleString()}
      </span>
    </div>
  )
}
