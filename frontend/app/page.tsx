'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  TrendingUp, Award, Activity,
  ShieldCheck, RefreshCw, BarChart2,
} from 'lucide-react';
import { useDealsData, useKPIs, useTrendData } from '@/hooks/useDeals';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TrendingDeals } from '@/components/dashboard/TrendingDeals';
import { CategoryChart } from '@/components/insights/CategoryChart';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { HeroSection } from '@/components/hero/HeroSection';
import { PipelineViz } from '@/components/pipeline/PipelineViz';
import { KPIMetric, SectionHeader } from '@/components/ui/GlowCard';
import { SafeWidget } from '@/components/ui/ErrorBoundary';
import { toast } from 'sonner';
import type { PipelineProgress } from '@/components/pipeline/PipelineViz';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useDealsData();
  const kpis  = useKPIs(data?.articles ?? []);
  const trend = useTrendData();

  const [pipelineRunning,  setPipelineRunning]  = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress[]>([]);

  const handleRunPipeline = async () => {
    setPipelineRunning(true);
    setPipelineComplete(false);
    setPipelineProgress([]);

    try {
      const res = await fetch('/api/run-pipeline', { method: 'POST' });
      if (!res.ok) throw new Error('api-unavailable');
      const { job_id } = await res.json();
      const es = new EventSource(`/api/jobs/${job_id}/stream`);
      es.addEventListener('progress', (e: Event) => {
        const d = JSON.parse((e as MessageEvent).data);
        setPipelineProgress(prev => [...prev, d]);
      });
      es.addEventListener('complete', () => {
        setPipelineRunning(false); setPipelineComplete(true); es.close();
        refetch();
        toast.success('Pipeline complete — dashboard refreshed');
      });
      es.addEventListener('error', () => {
        setPipelineRunning(false); es.close();
        toast.error('Pipeline error');
      });
    } catch {
      // Demo simulation when backend is offline
      const stages = ['ingestion','dedup','relevance','credibility','summarization','newsletter_gen','newsletter'];
      let i = 0;
      const counts = [38, 30, 25, 22, 22, 22, 22];
      const simulate = () => {
        if (i >= stages.length) {
          setPipelineRunning(false); setPipelineComplete(true);
          toast.success('Pipeline complete (demo mode)');
          return;
        }
        setPipelineProgress(prev => [...prev, {
          stage: stages[i], input: counts[i], output: counts[Math.min(i+1, counts.length-1)],
          message: `Stage ${i+1} complete`,
        }]);
        i++;
        setTimeout(simulate, 550 + Math.random() * 350);
      };
      simulate();
    }
  };

  if (isLoading) return <div className="p-4 md:p-6"><DashboardSkeleton /></div>;

  const articles = data?.articles ?? [];
  const summary  = data?.summary  ?? null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <HeroSection onRunPipeline={handleRunPipeline} isRunning={pipelineRunning} totalDeals={kpis.totalDeals} />
      </motion.div>

      {/* Pipeline Visualization */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <PipelineViz
          isRunning={pipelineRunning}
          isComplete={pipelineComplete}
          progress={pipelineProgress}
          onRunPipeline={handleRunPipeline}
        />
      </motion.div>

      {/* KPI Cards */}
      <div>
        <SectionHeader title="Intelligence Overview" subtitle="Derived from latest pipeline run" accent="blue" />
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div variants={item}>
            <KPIMetric label="Total Deals" value={kpis.totalDeals} icon={TrendingUp} color="blue"
              change={summary ? `${summary.total_input - summary.final_count} filtered` : undefined}
              positive={false} subtext="Processed this run" />
          </motion.div>
          <motion.div variants={item}>
            <KPIMetric label="Top Brand" value={kpis.topBrand || 'Unilever'} icon={Award} color="violet" subtext="Most active in M&A" />
          </motion.div>
          <motion.div variants={item}>
            <KPIMetric label="Avg Relevance" value={`${kpis.avgScore.toFixed(1)}`} icon={Activity} color="cyan" subtext="Weighted score / 100" />
          </motion.div>
          <motion.div variants={item}>
            <KPIMetric label="Avg Credibility" value={`${kpis.avgCredibility.toFixed(1)} / 9`} icon={ShieldCheck} color="green" subtext="Source tier score" />
          </motion.div>
        </motion.div>
      </div>

      {/* Pipeline funnel bars */}
      {summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <SectionHeader title="Pipeline Funnel" subtitle="Record survival through each stage" accent="violet" />
          <div className="glass rounded-xl p-5">
            <div className="flex items-end gap-2 h-24">
              {([
                { label: 'Input',    value: summary.total_input,     color: '#60a5fa' },
                { label: 'Dedup',    value: summary.after_dedup,     color: '#a78bfa' },
                { label: 'Relevant', value: summary.after_relevance, color: '#22d3ee' },
                { label: 'Final',    value: summary.final_count,     color: '#34d399' },
              ] as const).map(({ label, value, color }, i) => {
                const pct = (value / summary.total_input) * 100;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ delay: i * 0.1 + 0.4, duration: 0.5, ease: 'easeOut' }}
                      className="w-full rounded-t-lg"
                      style={{ background: `linear-gradient(to top, ${color}55, ${color}25)`, border: `1px solid ${color}30` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <SectionHeader title="Deal Activity Analytics" subtitle="Trend analysis and category breakdown" accent="cyan" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-foreground">Deal Trend — Weekly</span>
              {isFetching && <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
            </div>
            <SafeWidget label="Trend Chart">
              <TrendChart data={trend} />
            </SafeWidget>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-foreground">Category Split</span>
            </div>
            <SafeWidget label="Category Chart">
              <CategoryChart data={kpis.typeBreakdown} isLoading={isLoading} />
            </SafeWidget>
          </div>
        </div>
      </motion.div>

      {/* Top deals */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <SectionHeader title="Top Deals by Score" subtitle="Ranked by combined relevance + credibility" accent="green" />
        <SafeWidget label="Top Deals">
          <div className="glass rounded-xl p-4">
            <TrendingDeals articles={articles.slice(0, 8)} />
          </div>
        </SafeWidget>
      </motion.div>

    </div>
  );
}
