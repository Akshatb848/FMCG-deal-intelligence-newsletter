'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search,
  ExternalLink, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RawRecord } from '@/types';
import { toast } from 'sonner';

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: { key: keyof RawRecord; label: string; width: string; truncate?: number }[] = [
  { key: 'published_date', label: 'Date',    width: 'w-24',  truncate: undefined },
  { key: 'title',          label: 'Title',   width: 'w-80',  truncate: 80 },
  { key: 'source',         label: 'Source',  width: 'w-32',  truncate: 24 },
  { key: 'category',       label: 'Category',width: 'w-28',  truncate: 20 },
  { key: 'url',            label: 'URL',     width: 'w-24',  truncate: undefined },
];

const PAGE_SIZE = 20;

type SortDir = 'asc' | 'desc' | null;

// ── Sort icon helper ──────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string | null; dir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" />;
  if (dir === 'asc')  return <ChevronUp   className="w-3 h-3 text-primary" />;
  if (dir === 'desc') return <ChevronDown className="w-3 h-3 text-primary" />;
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function DataTable({ records }: { records: RawRecord[] }) {
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<string | null>(null);
  const [sortDir, setSortDir]   = useState<SortDir>(null);
  const [page, setPage]         = useState(1);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      (r.title?.toLowerCase().includes(q)) ||
      (r.source?.toLowerCase().includes(q)) ||
      (r.category?.toLowerCase().includes(q)) ||
      (r.summary?.toLowerCase().includes(q))
    );
  }, [records, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey as keyof RawRecord] ?? '');
      const bv = String(b[sortKey as keyof RawRecord] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc')  setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
    setPage(1);
  };

  const exportCSV = () => {
    const headers = COLUMNS.map(c => c.label).join(',');
    const rows = sorted.map(r =>
      COLUMNS.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw_data.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sorted.length} records as CSV`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title, source, category…"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10
                       text-foreground placeholder:text-muted-foreground/60 outline-none
                       focus:border-primary/50 focus:bg-white/[0.08] transition-colors w-72"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {records.length} records
          </span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                       glass border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium w-10">#</th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'text-left px-4 py-3 text-muted-foreground font-medium cursor-pointer',
                      'hover:text-foreground transition-colors select-none', col.width,
                    )}
                    onClick={() => handleSort(col.key as string)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key as string} sortKey={sortKey} dir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {pageItems.map((record, idx) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      'border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors',
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground/50 tabular-nums">
                      {(safePage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    {COLUMNS.map(col => {
                      const val = String(record[col.key] ?? '');
                      const display = col.truncate && val.length > col.truncate
                        ? val.slice(0, col.truncate) + '…'
                        : val;

                      if (col.key === 'url' && val.startsWith('http')) {
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <a
                              href={val}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:underline"
                            >
                              Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-muted-foreground"
                          title={col.truncate ? val : undefined}
                        >
                          {col.key === 'title'
                            ? <span className="text-foreground font-medium">{display}</span>
                            : display || <span className="text-muted-foreground/30">—</span>}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </AnimatePresence>

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center py-12 text-muted-foreground">
                    No records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pg = i + 1;
                if (totalPages > 5 && safePage > 3) pg = safePage - 2 + i;
                pg = Math.min(pg, totalPages);
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={cn(
                      'w-7 h-7 rounded text-xs transition-colors',
                      pg === safePage
                        ? 'bg-primary text-white font-semibold'
                        : 'hover:bg-white/10 text-muted-foreground',
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
