'use client';

import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn, DEAL_TYPE_CONFIG } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { FilterState } from '@/types';

const DATE_OPTIONS: { value: FilterState['dateRange']; label: string }[] = [
  { value: '7d',  label: 'Past 7 days'  },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
  { value: 'all', label: 'All time'     },
];

interface NewsFiltersProps {
  sources: string[];
}

export function NewsFilters({ sources }: NewsFiltersProps) {
  const { filters, setFilter, resetFilters } = useStore();

  const hasActiveFilters =
    filters.dealType !== 'all' ||
    filters.source !== 'all' ||
    filters.dateRange !== '30d' ||
    filters.search ||
    filters.minScore > 0;

  return (
    <div className="glass rounded-xl border border-white/[0.08] p-4 space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg
                      border border-white/[0.06] px-3 py-2.5
                      focus-within:border-primary/30 transition-colors">
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search deals, companies, sources…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground
                     placeholder:text-muted-foreground outline-none"
        />
        {filters.search && (
          <button onClick={() => setFilter('search', '')}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3 h-3" />
          <span>Filters:</span>
        </div>

        {/* Deal type chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('dealType', 'all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
              filters.dealType === 'all'
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:border-white/20',
            )}
          >
            All Types
          </button>
          {(Object.keys(DEAL_TYPE_CONFIG) as Array<keyof typeof DEAL_TYPE_CONFIG>).map((type) => {
            const cfg = DEAL_TYPE_CONFIG[type];
            const active = filters.dealType === type;
            return (
              <button
                key={type}
                onClick={() => setFilter('dealType', active ? 'all' : type)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  active
                    ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                    : 'bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:border-white/20',
                )}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div className="flex items-center rounded-lg overflow-hidden border border-white/[0.08]">
          {DATE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter('dateRange', value)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-all',
                filters.dateRange === value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Source select */}
        {sources.length > 0 && (
          <select
            value={filters.source}
            onChange={(e) => setFilter('source', e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-muted-foreground
                       border border-white/[0.08] outline-none cursor-pointer
                       hover:border-white/20 transition-colors"
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Clear */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300
                       transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Min score slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Min Score: <span className="font-bold text-foreground">{filters.minScore}</span>
        </span>
        <input
          type="range"
          min={0}
          max={80}
          step={5}
          value={filters.minScore}
          onChange={(e) => setFilter('minScore', Number(e.target.value))}
          className="flex-1 accent-blue-500 cursor-pointer"
        />
      </div>
    </div>
  );
}
