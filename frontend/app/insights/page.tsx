'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import { useDealsData, useTrendData } from '@/hooks/useDeals';
import { CategoryChart } from '@/components/insights/CategoryChart';
import { CompanyTrends } from '@/components/insights/CompanyTrends';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { cn, DEAL_TYPE_CONFIG, scoreColor } from '@/lib/utils';
import type { DealType } from '@/types';

const RADAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E'];

export default function InsightsPage() {
  const { data, isLoading } = useDealsData();
  const trend = useTrendData();
  const articles = data?.articles ?? [];
  const summary  = data?.summary ?? null;

  // Score distribution data
  const scoreDistribution = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${(i + 1) * 10}`,
      count: 0,
    }));
    articles.forEach((a) => {
      const bucket = Math.min(9, Math.floor(a.relevance_score / 10));
      buckets[bucket].count++;
    });
    return buckets.filter((b) => b.count > 0);
  }, [articles]);

  // Radar chart: avg scores by deal type
  const radarData = useMemo(() => {
    const byType: Record<string, { domain: number[]; deal: number[]; cred: number[] }> = {};
    articles.forEach((a) => {
      const t = a.deal_type_detected;
      (byType[t] ??= { domain: [], deal: [], cred: [] });
      byType[t].domain.push(a.score_domain);
      byType[t].deal.push(a.score_deal);
      byType[t].cred.push(a.credibility_score);
    });
    return Object.entries(byType).slice(0, 6).map(([type, scores]) => ({
      type: type.slice(0, 10),
      domain:      Math.round(scores.domain.reduce((s, v) => s + v, 0) / scores.domain.length),
      deal:        Math.round(scores.deal.reduce((s, v) => s + v, 0) / scores.deal.length),
      credibility: Math.round(scores.cred.reduce((s, v) => s + v, 0) / scores.cred.length * 4),
    }));
  }, [articles]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20
                        flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Market Insights</h1>
          <p className="text-xs text-muted-foreground">
            Analytics & patterns from {articles.length} deals
          </p>
        </div>
      </motion.div>

      {/* Row 1: Category + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summary?.type_breakdown && (
          <CategoryChart data={summary.type_breakdown} />
        )}
        <CompanyTrends articles={articles} />
      </div>

      {/* Row 2: Trend chart + Score distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendChart data={trend} />
        </div>

        {/* Score distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl border border-white/[0.08] p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Score Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Relevance score histogram</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: 'hsl(215 25% 55%)', fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215 25% 55%)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(222 40% 8%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {scoreDistribution.map((entry, i) => {
                    const midScore = (i + 0.5) * 10;
                    const color = midScore >= 70 ? '#10B981' : midScore >= 50 ? '#3B82F6' : midScore >= 30 ? '#F59E0B' : '#F43F5E';
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Radar chart + Pipeline stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl border border-white/[0.08] p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Score Profile by Deal Type</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Average domain, deal, and credibility scores
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="type" tick={{ fill: 'hsl(215 25% 55%)', fontSize: 10 }} />
                <Radar
                  name="Domain Score"
                  dataKey="domain"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
                <Radar
                  name="Deal Score"
                  dataKey="deal"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(222 40% 8%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pipeline funnel / stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-xl border border-white/[0.08] p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Pipeline Analytics</h3>
          <p className="text-xs text-muted-foreground mb-4">Stage-by-stage processing metrics</p>

          {summary ? (
            <div className="space-y-3">
              {[
                { label: 'Input Records',    value: summary.total_input,     pct: 100,                                              color: 'bg-slate-400' },
                { label: 'After Dedup',      value: summary.after_dedup,     pct: (summary.after_dedup / summary.total_input)*100,   color: 'bg-blue-400' },
                { label: 'After Relevance',  value: summary.after_relevance, pct: (summary.after_relevance / summary.total_input)*100, color: 'bg-violet-400' },
                { label: 'Final Output',     value: summary.final_count,     pct: (summary.final_count / summary.total_input)*100,   color: 'bg-emerald-400' },
                { label: 'Blocked/Dropped',  value: summary.blocked + summary.dropped, pct: ((summary.blocked+summary.dropped)/summary.total_input)*100, color: 'bg-rose-400' },
              ].map(({ label, value, pct, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{value}</span>
                      <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', color)}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-white/[0.06] mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Survival Rate</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {Math.round((summary.final_count / summary.total_input) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pipeline data available.</p>
          )}
        </motion.div>
      </div>

      {/* Score table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl border border-white/[0.08] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-foreground">Top 10 Deals by Score</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['#', 'Title', 'Type', 'Source', 'Domain', 'Deal', 'Credibility', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.slice(0, 10).map((a, i) => {
                const cfg = DEAL_TYPE_CONFIG[a.deal_type_detected] ?? DEAL_TYPE_CONFIG['Other'];
                return (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground font-semibold">{i + 1}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-xs truncate">{a.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border', cfg.bg, cfg.color, cfg.border)}>
                        {a.deal_type_detected}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{a.source}</td>
                    <td className="px-4 py-2.5 font-semibold text-blue-400">{a.score_domain}</td>
                    <td className="px-4 py-2.5 font-semibold text-violet-400">{a.score_deal}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-400">{a.credibility_score}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('font-bold', scoreColor(a.relevance_score))}>
                        {a.relevance_score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
