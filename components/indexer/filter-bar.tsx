'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { FilterParams, DomainStatus } from '@/types/domain'

type FilterBarProps = {
  filters: FilterParams
  onTabChange: (tab: DomainStatus) => void
  onFilterChange: (key: keyof FilterParams, value: FilterParams[keyof FilterParams]) => void
  onSearchChange: (value: string) => void
  total: number | null
}

const TABS: { value: DomainStatus; label: string; color: string }[] = [
  { value: 'active',  label: 'Active',       color: 'text-emerald-400' },
  { value: 'grace',   label: 'Grace Period',  color: 'text-amber-400'   },
  { value: 'expired', label: 'Just Dropped',  color: 'text-red-400'     },
]

const LENGTHS: { value: FilterParams['length']; label: string }[] = [
  { value: 'all',   label: 'All'  },
  { value: 3,       label: '3'    },
  { value: 4,       label: '4'    },
  { value: 5,       label: '5'    },
  { value: 6,       label: '6'    },
  { value: 7,       label: '7'    },
  { value: '8plus', label: '8+'   },
]

const TYPES: { value: FilterParams['type']; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'numeric', label: 'Numeric' },
  { value: 'alpha',   label: 'Alpha'   },
  { value: 'mixed',   label: 'Mixed'   },
  { value: 'emoji',   label: 'Emoji'   },
]

const WINDOWS: { value: FilterParams['window']; label: string }[] = [
  { value: 'all',   label: 'All'    },
  { value: 'today', label: 'Today'  },
  { value: '7d',    label: '7 Days' },
  { value: '14d',   label: '14 Days'},
  { value: '30d',   label: '30 Days'},
]

const SORTS: { value: FilterParams['sort']; label: string }[] = [
  { value: 'expiry_asc',  label: 'Soonest first'  },
  { value: 'expiry_desc', label: 'Latest first'   },
  { value: 'grace_asc',   label: 'Grace ending soon' },
  { value: 'name_asc',    label: 'Name (A-Z)'     },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function FilterBar({
  filters,
  onTabChange,
  onFilterChange,
  onSearchChange,
  total,
}: FilterBarProps) {
  return (
    <div className="space-y-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-sm">

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800/60 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filters.tab === tab.value
                ? `bg-zinc-800 ${tab.color}`
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        {total !== null && (
          <span className="ml-auto text-xs text-zinc-600 tabular-nums">
            {total.toLocaleString()} domains
          </span>
        )}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search domains by name…"
            className="pl-9 pr-8 bg-zinc-900 border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 h-9"
          />
          {filters.search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value as FilterParams['sort'])}
          className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-md px-2.5 h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter chips — scrollable on mobile */}
      <div className="space-y-2 overflow-x-auto pb-0.5">

        {/* Length */}
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-xs text-zinc-600 w-12 shrink-0">Length</span>
          <div className="flex gap-1 flex-wrap">
            {LENGTHS.map((l) => (
              <Chip
                key={String(l.value)}
                active={filters.length === l.value}
                onClick={() => onFilterChange('length', l.value)}
              >
                {l.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-xs text-zinc-600 w-12 shrink-0">Type</span>
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((t) => (
              <Chip
                key={t.value}
                active={filters.type === t.value}
                onClick={() => onFilterChange('type', t.value)}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Window — label changes based on tab */}
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-xs text-zinc-600 w-12 shrink-0">
            {filters.tab === 'expired' ? 'Dropped' : 'Expires'}
          </span>
          <div className="flex gap-1 flex-wrap">
            {WINDOWS.map((w) => (
              <Chip
                key={w.value}
                active={filters.window === w.value}
                onClick={() => onFilterChange('window', w.value)}
              >
                {w.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
