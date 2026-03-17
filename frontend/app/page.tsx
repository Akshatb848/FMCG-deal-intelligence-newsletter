'use client';

import { motion } from 'framer-motion';
import { Zap, RefreshCw, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { useDealsData, useKPIs, useTrendData } from '@/hooks/useDeals';
import { KPICards } from '@/components/dashboard/KPICards';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TrendingDeals } from '@/components/dashboard/TrendingDeals';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { CategoryChart } from '@/components/insights/CategoryChart';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDealsData();
  const kpis = useKPIs(data?.articles ?? []);
  const trend = useTrendData();

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20
                        flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-rose-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Unable to load data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Could not connect to the pipeline API. Showing sample data.
        </p>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary
                     text-sm font-medium hover:bg-primary/30 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const articles  = data?.articles ?? [];
  const summary   = data?.summary ?? null;
  const issueDate = formatDate(new Date().toISOString().split('T')[0]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08]
                   bg-gradient-to-br from-blue-600/10 via-violet-600/5 to-transparent p-6"
      >
        {/* Decorative gradient blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/20
                        to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full
                                 bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Live Pipeline</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              Today's{' '}
              <span className="text-gradient">FMCG Insights</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              {articles.length} deals intelligence articles processed by AI pipeline · {issueDate}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
                'bg-white/[0.06] border border-white/[0.10] text-muted-foreground',
                'hover:bg-white/[0.10] hover:text-foreground transition-all',
                isFetching && 'opacity-60',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <Link
              href="/news"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                         bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              View All Deals
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06] flex-wrap">
          {[
            { label: 'Total Input',      value: summary?.total_input   ?? articles.length, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'After Dedup',      value: summary?.after_dedup   ?? '—',             icon: Clock,      color: 'text-violet-400' },
            { label: 'Final Deals',      value: summary?.final_count   ?? articles.length, icon: Zap,        color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className={cn('w-3.5 h-3.5', color)} />
              <span className="text-xs text-muted-foreground">{label}:</span>
              <span className={cn('text-sm font-bold', color)}>{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <KPICards kpis={kpis} summary={summary} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendChart data={trend} />
        </div>
        <div>
          {summary?.type_breakdown && (
            <CategoryChart data={summary.type_breakdown} />
          )}
        </div>
      </div>

      {/* Trending deals */}
      <TrendingDeals articles={articles} limit={8} />
    </div>
  );
}
