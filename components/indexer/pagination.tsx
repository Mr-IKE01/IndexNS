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

  // Build page numbers to show (max 7 slots)
  function getPages(): (number | '...')[] {
    if (totalPages === null) return []
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

    const pages: (number | '...')[] = []

    pages.push(1)

    if (page > 4) pages.push('...')

    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)

    for (let i = start; i <= end; i++) pages.push(i)

    if (page < totalPages - 3) pages.push('...')

    pages.push(totalPages)

    return pages
  }

  const pages = getPages()

  return (
    <div className="flex items-center justify-center gap-1 py-6 px-4">
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-zinc-600 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={[
              'w-8 h-8 rounded-md text-sm font-medium transition-colors',
              p === page
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
            ].join(' ')}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Total page indicator */}
      {totalPages && (
        <span className="ml-2 text-xs text-zinc-600 tabular-nums">
          of {totalPages.toLocaleString()}
        </span>
      )}
    </div>
  )
      }
