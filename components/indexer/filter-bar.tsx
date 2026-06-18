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

const TABS: { value: DomainStatus; label: string; activeColor: string; dot: string }[] = [
  { value: 'active',  label: 'Active',       activeColor: '#22c55e', dot: '#22c55e' },
  { value: 'grace',   label: 'Grace Period',  activeColor: '#f59e0b', dot: '#f59e0b' },
  { value: 'expired', label: 'Just Dropped',  activeColor: '#ef4444', dot: '#ef4444' },
]

const LENGTHS: { value: FilterParams['length']; label: string }[] = [
  { value: 'all',   label: 'All' },
  { value: 1,       label: '1'   },
  { value: 2,       label: '2'   },
  { value: 3,       label: '3'   },
  { value: 4,       label: '4'   },
  { value: 5,       label: '5'   },
  { value: 6,       label: '6'   },
  { value: 7,       label: '7'   },
  { value: '8plus', label: '8+'  },
]

const TYPES: { value: FilterParams['type']; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'numeric', label: '123 Numeric' },
  { value: 'alpha',   label: 'ABC Alpha'   },
  { value: 'mixed',   label: 'A1B Mixed'   },
  { value: 'emoji',   label: '😀 Emoji'   },
]

const WINDOWS: { value: FilterParams['window']; label: string }[] = [
  { value: 'all',   label: 'All time' },
  { value: 'today', label: 'Today'    },
  { value: '7d',    label: '7 days'   },
  { value: '14d',   label: '14 days'  },
  { value: '30d',   label: '30 days'  },
]

const SORTS: { value: FilterParams['sort']; label: string }[] = [
  { value: 'expiry_asc',  label: 'Expiring soonest' },
  { value: 'expiry_desc', label: 'Expiring latest'  },
  { value: 'grace_asc',   label: 'Grace ending soon'},
  { value: 'name_asc',    label: 'Name A–Z'         },
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
      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
      style={active ? {
        background: 'linear-gradient(135deg, oklch(0.72 0.18 195 / 0.25), oklch(0.60 0.18 285 / 0.25))',
        color: '#2dd4bf',
        border: '1px solid oklch(0.72 0.18 195 / 0.5)',
      } : {
        background: 'oklch(0.20 0.05 285)',
        color: 'oklch(0.55 0.05 285)',
        border: '1px solid oklch(0.25 0.05 285)',
      }}
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
    <div
      className="space-y-3 px-4 py-3 sticky top-14 z-10 backdrop-blur-md"
      style={{ borderBottom: '1px solid oklch(0.22 0.05 285)', background: 'oklch(0.13 0.04 285 / 0.95)' }}
    >

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = filters.tab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all"
              style={isActive ? {
                background: 'oklch(0.20 0.06 285)',
                color: tab.activeColor,
                border: `1px solid ${tab.activeColor}33`,
              } : {
                color: 'oklch(0.50 0.05 285)',
                border: '1px solid transparent',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isActive ? tab.dot : 'oklch(0.35 0.05 285)' }}
              />
              {tab.label}
            </button>
          )
        })}
        {total !== null && (
          <span
            className="ml-auto text-xs font-mono tabular-nums"
            style={{ color: 'oklch(0.45 0.05 285)' }}
          >
            {total.toLocaleString()} domains
          </span>
        )}
      </div>

      {/* Search + Sort row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'oklch(0.45 0.05 285)' }}
          />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search domain names…"
            className="pl-8 pr-8 h-9 text-sm font-mono text-white placeholder:font-sans"
            style={{
              background: 'oklch(0.17 0.04 285)',
              borderColor: 'oklch(0.25 0.06 285)',
            }}
          />
          {filters.search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'oklch(0.45 0.05 285)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value as FilterParams['sort'])}
          className="h-9 rounded-md px-2.5 text-xs font-medium outline-none cursor-pointer"
          style={{
            background: 'oklch(0.17 0.04 285)',
            border: '1px solid oklch(0.25 0.06 285)',
            color: 'oklch(0.70 0.05 285)',
          }}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className="space-y-2 overflow-x-auto pb-0.5 no-scrollbar">

        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] uppercase tracking-wider w-14 shrink-0"
            style={{ color: 'oklch(0.40 0.05 285)' }}>
            Length
          </span>
          <div className="flex gap-1">
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

        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] uppercase tracking-wider w-14 shrink-0"
            style={{ color: 'oklch(0.40 0.05 285)' }}>
            Type
          </span>
          <div className="flex gap-1">
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

        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] uppercase tracking-wider w-14 shrink-0"
            style={{ color: 'oklch(0.40 0.05 285)' }}>
            {filters.tab === 'expired' ? 'Dropped' : 'Expires'}
          </span>
          <div className="flex gap-1">
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
