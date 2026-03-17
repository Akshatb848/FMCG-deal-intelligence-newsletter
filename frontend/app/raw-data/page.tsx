'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database, RefreshCw, AlertCircle, Play } from 'lucide-react';
import { DataTable } from '@/components/raw-data/DataTable';
import { CardSkeleton } from '@/components/ui/skeleton';
import type { RawDataResponse, RawRecord } from '@/types';
import { toast } from 'sonner';
import { MOCK_ARTICLES } from '@/lib/mockData';

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchRawData(): Promise<RawDataResponse> {
  const res = await fetch('/api/raw-data');
  if (!res.ok) {
    if (res.status === 404) {
      // Fall back to mock data shaped as RawDataResponse
      const records = MOCK_ARTICLES as unknown as RawRecord[];
      return { count: records.length, records };
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function triggerPipeline() {
  const res = await fetch('/api/run-pipeline', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start pipeline');
  return res.json();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RawDataPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<RawDataResponse>({
      queryKey: ['raw-data'],
      queryFn: fetchRawData,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });

  const handleRunPipeline = async () => {
    try {
      const { job_id } = await triggerPipeline();
      toast.success(`Pipeline started (job: ${job_id.slice(0, 8)}…)`, {
        description: 'Refresh after ~15 seconds to see updated raw data.',
      });
    } catch {
      toast.error('Could not start pipeline. Is the backend running on :8000?');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Raw Data Viewer</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Stage 1 output — all records ingested before filtering or scoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                       bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30
                       transition-colors text-emerald-400 font-medium"
          >
            <Play className="w-3 h-3" />
            Run Pipeline
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                       glass border border-white/10 hover:bg-white/10 transition-colors
                       disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: 'Total Records',    value: data.count },
            { label: 'Unique Sources',   value: [...new Set(data.records.map(r => r.source))].length },
            { label: 'Date Range',       value: (() => {
                const dates = data.records.map(r => r.published_date).filter(Boolean).sort();
                if (!dates.length) return '—';
                return dates[0] === dates[dates.length - 1]
                  ? dates[0]
                  : `${dates[0]} → ${dates[dates.length - 1]}`;
              })() },
            { label: 'With URL',         value: data.records.filter(r => r.url?.startsWith('http')).length },
          ].map(({ label, value }) => (
            <div key={label} className="glass rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-foreground">{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center"
        >
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="font-semibold text-foreground">No raw data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as Error)?.message ?? 'Run the pipeline to ingest your first dataset.'}
            </p>
          </div>
          <button
            onClick={handleRunPipeline}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-primary/20 border border-primary/30 hover:bg-primary/30
                       transition-colors text-primary text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Run Pipeline Now
          </button>
        </motion.div>
      )}

      {/* Table */}
      {data && <DataTable records={data.records} />}
    </div>
  );
}
