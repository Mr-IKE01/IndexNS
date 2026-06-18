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

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: '1px solid transparent',
  }

  return (
    <div className="flex items-center justify-center gap-1 py-8 px-4">
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={{
          ...btnBase,
          color: page <= 1 ? 'oklch(0.30 0.05 285)' : 'oklch(0.60 0.05 285)',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`e${i}`}
            className="w-8 text-center text-xs select-none"
            style={{ color: 'oklch(0.35 0.05 285)' }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            style={p === page ? {
              ...btnBase,
              background: 'linear-gradient(135deg, oklch(0.72 0.18 195 / 0.2), oklch(0.60 0.18 285 / 0.2))',
              color: '#2dd4bf',
              borderColor: 'oklch(0.72 0.18 195 / 0.4)',
            } : {
              ...btnBase,
              color: 'oklch(0.55 0.05 285)',
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        style={{
          ...btnBase,
          color: !hasNextPage ? 'oklch(0.30 0.05 285)' : 'oklch(0.60 0.05 285)',
          cursor: !hasNextPage ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {totalPages && (
        <span className="ml-2 text-xs font-mono tabular-nums" style={{ color: 'oklch(0.40 0.05 285)' }}>
          of {totalPages.toLocaleString()} pages
        </span>
      )}
    </div>
  )
}
