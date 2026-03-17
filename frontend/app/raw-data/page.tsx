'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database, RefreshCw, AlertCircle, Play, Hash, Link2, Calendar, Tag } from 'lucide-react';
import { DataTable } from '@/components/raw-data/DataTable';
import type { RawDataResponse, RawRecord } from '@/types';
import { MOCK_ARTICLES } from '@/lib/mockData';
import { NeonBadge, SectionHeader } from '@/components/ui/GlowCard';
import { toast } from 'sonner';

async function fetchRawData(): Promise<RawDataResponse> {
  const res = await fetch('/api/raw-data');
  if (!res.ok) {
    if (res.status === 404) return { count: MOCK_ARTICLES.length, records: MOCK_ARTICLES as unknown as RawRecord[] };
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function triggerPipeline() {
  const res = await fetch('/api/run-pipeline', { method: 'POST' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function RawDataPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<RawDataResponse>({ queryKey: ['raw-data'], queryFn: fetchRawData, staleTime: 2 * 60 * 1000, retry: 1 });

  const handleRunPipeline = async () => {
    try {
      const { job_id } = await triggerPipeline();
      toast.success(`Pipeline started (${job_id.slice(0,8)}…)`);
    } catch { toast.error('Could not start pipeline'); }
  };

  const uniqueSources = data ? Array.from(new Set(data.records.map(r => r.source))).length : 0;
  const withUrl       = data ? data.records.filter(r => r.url?.startsWith('http')).length : 0;
  const dateRange = (() => {
    if (!data?.records.length) return '—';
    const dates = data.records.map(r => r.published_date).filter(Boolean).sort();
    return `${dates[0]} → ${dates[dates.length - 1]}`;
  })();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5" style={{ color: '#60a5fa' }} />
            <h1 className="text-xl font-bold text-foreground">Raw Data Viewer</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Stage 1 output — all records ingested before filtering or scoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
            <Play className="w-3 h-3" />Run Pipeline
          </button>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Records',  value: data.count,     icon: Hash,     color: '#60a5fa' },
            { label: 'Unique Sources', value: uniqueSources,  icon: Tag,      color: '#a78bfa' },
            { label: 'With URL',       value: withUrl,        icon: Link2,    color: '#34d399' },
            { label: 'Date Range',     value: dateRange,      icon: Calendar, color: '#22d3ee' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-xl p-4 flex items-center gap-3 card-lift">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                <p className="text-sm font-bold truncate" style={{ color }}>{value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Stage info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
           style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Database className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">Stage 1 – Ingestion: </span>
          Raw records loaded from CSV/JSON source. Columns are normalised but no filtering or scoring has been applied yet.
          These records include duplicates and potentially off-topic articles — processing happens in stages 2–7.
        </div>
      </div>

      {/* Loading */}
      {isLoading && <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 shimmer rounded-lg" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}</div>}

      {/* Error */}
      {isError && !data && (
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="font-semibold text-foreground">No raw data available</p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message}</p>
          </div>
          <button onClick={handleRunPipeline}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
            <Play className="w-4 h-4" />Run Pipeline Now
          </button>
        </div>
      )}

      {/* Table */}
      {data && (
        <div>
          <SectionHeader title="Records" subtitle={`${data.count} total · searchable · sortable · exportable`} accent="blue" />
          <DataTable records={data.records} />
        </div>
      )}
    </div>
  );
}
