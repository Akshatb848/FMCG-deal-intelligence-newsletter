'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Newspaper, RefreshCw, Play, AlertCircle, Loader2 } from 'lucide-react';
import { NewsletterView } from '@/components/newsletter/NewsletterView';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import type { Newsletter } from '@/types';
import { toast } from 'sonner';
import { MOCK_NEWSLETTER } from '@/lib/mockData';

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchNewsletter(): Promise<Newsletter> {
  const res = await fetch('/api/newsletter');
  if (!res.ok) {
    if (res.status === 404) return MOCK_NEWSLETTER;
    throw new Error(`Failed to fetch newsletter: ${res.status}`);
  }
  return res.json();
}

async function triggerPipeline(): Promise<{ job_id: string }> {
  const res = await fetch('/api/run-pipeline', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start pipeline');
  return res.json();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const {
    data: newsletter,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Newsletter>({
    queryKey: ['newsletter'],
    queryFn: fetchNewsletter,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRunPipeline = async () => {
    try {
      const { job_id } = await triggerPipeline();
      toast.success(`Pipeline started (job: ${job_id.slice(0, 8)}…)`, {
        description: 'Refresh the page in ~15 seconds to see the new newsletter.',
      });
    } catch {
      toast.error('Failed to start pipeline. Is the backend running?');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Newsletter</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            FMCG Deal Intelligence Daily Brief — structured report from the latest pipeline run
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

      {/* States */}
      {isLoading && <DashboardSkeleton />}

      {isError && !newsletter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center"
        >
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="font-semibold text-foreground">No newsletter data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as Error)?.message ?? 'Run the pipeline to generate your first newsletter.'}
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

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Refreshing newsletter…
        </div>
      )}

      {newsletter && <NewsletterView newsletter={newsletter} />}
    </div>
  );
}
