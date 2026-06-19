'use client'

import { Search, X } from 'lucide-react'
import type { FilterParams, DomainStatus } from '@/types/domain'

type FilterBarProps = {
  filters: FilterParams
  onTabChange: (tab: DomainStatus) => void
  onFilterChange: (key: keyof FilterParams, value: FilterParams[keyof FilterParams]) => void
  onSearchChange: (value: string) => void
  total: number | null
}

const TABS: { value: DomainStatus; label: string; active: string }[] = [
  { value: 'active',  label: 'Active',       active: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/[0.07]' },
  { value: 'grace',   label: 'Grace Period',  active: 'text-amber-400  border-amber-400/30  bg-amber-400/[0.07]'  },
  { value: 'expired', label: 'Just Dropped',  active: 'text-red-400    border-red-400/30    bg-red-400/[0.07]'    },
]

const LENGTHS: { value: FilterParams['length']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 1,     label: '1'   },
  { value: 2,     label: '2'   },
  { value: 3,     label: '3'   },
  { value: 4,     label: '4'   },
  { value: 5,     label: '5'   },
  { value: 6,     label: '6'   },
  { value: 7,     label: '7'   },
  { value: '8plus', label: '8+' },
]

const TYPES: { value: FilterParams['type']; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'numeric', label: 'Numeric' },
  { value: 'alpha',   label: 'Alpha'   },
  { value: 'mixed',   label: 'Mixed'   },
  { value: 'emoji',   label: 'Emoji'   },
]

const WINDOWS: { value: FilterParams['window']; label: string }[] = [
  { value: 'all',   label: 'All time' },
  { value: 'today', label: 'Today'    },
  { value: '7d',    label: '7d'       },
  { value: '14d',   label: '14d'      },
  { value: '30d',   label: '30d'      },
]

const SORTS: { value: FilterParams['sort']; label: string }[] = [
  { value: 'expiry_asc',  label: 'Expiring soonest'  },
  { value: 'expiry_desc', label: 'Expiring latest'   },
  { value: 'grace_asc',   label: 'Grace ending soon' },
  { value: 'name_asc',    label: 'Name A–Z'          },
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
        'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
        active
          ? 'bg-teal-400/[0.10] text-teal-300 border-teal-400/25'
          : 'bg-transparent text-zinc-500 border-white/[0.06] hover:text-zinc-300 hover:border-white/[0.12]',
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
    <div className="sticky top-14 z-10 bg-[#0d0a17]/95 backdrop-blur-md border-b border-white/[0.06] px-5 py-4 space-y-4">

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {TABS.map((tab) => {
          const isActive = filters.tab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={[
                'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all border',
                isActive
                  ? tab.active
                  : 'text-zinc-500 border-transparent hover:text-zinc-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
        {total !== null && (
          <span className="ml-auto text-xs font-mono text-zinc-600 tabular-nums">
            {total.toLocaleString()} domains
          </span>
        )}
      </div>

      {/* ── Search + Sort ─────────────────────────────────────────── */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search domain names…"
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] font-mono text-zinc-200 placeholder:text-zinc-600 placeholder:font-sans outline-none focus:border-teal-400/40 focus:bg-white/[0.06] transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value as FilterParams['sort'])}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-zinc-400 outline-none cursor-pointer focus:border-teal-400/40 transition-all"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#14101f]">{s.label}</option>
          ))}
        </select>
      </div>

      {/* ── Filter rows ───────────────────────────────────────────── */}
      <div className="space-y-2.5 overflow-x-auto no-scrollbar">

        <div className="flex items-center gap-3 min-w-max">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 w-[52px] shrink-0">Length</span>
          <div className="flex gap-1.5">
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

        <div className="flex items-center gap-3 min-w-max">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 w-[52px] shrink-0">Type</span>
          <div className="flex gap-1.5">
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

        <div className="flex items-center gap-3 min-w-max">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 w-[52px] shrink-0">
            {filters.tab === 'expired' ? 'Dropped' : 'Expires'}
          </span>
          <div className="flex gap-1.5">
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
