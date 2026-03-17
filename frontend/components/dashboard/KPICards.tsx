'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Award, Star, BarChart2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData, PipelineSummary } from '@/types';

interface KPICardsProps {
  kpis: KPIData;
  summary?: PipelineSummary | null;
}

const CARD_DEFS = [
  {
    key: 'totalDeals' as const,
    label: 'Total Deals',
    icon: BarChart2,
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    change: '+12%',
  },
  {
    key: 'topBrand' as const,
    label: 'Most Active Brand',
    icon: Award,
    color: 'violet',
    gradient: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    change: null,
  },
  {
    key: 'avgScore' as const,
    label: 'Avg Relevance Score',
    icon: Star,
    color: 'amber',
    gradient: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    change: '+3.2',
  },
  {
    key: 'avgCredibility' as const,
    label: 'Source Credibility',
    icon: TrendingUp,
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    change: '+0.4',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export function KPICards({ kpis, summary }: KPICardsProps) {
  const survivalRate = summary
    ? Math.round((summary.final_count / summary.total_input) * 100)
    : null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {CARD_DEFS.map(({ key, label, icon: Icon, gradient, border, text, change }) => {
        const value = kpis[key];

        return (
          <motion.div
            key={key}
            variants={item}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className={cn(
              'relative overflow-hidden rounded-xl border p-4 cursor-default',
              'bg-gradient-to-br glass',
              gradient,
              border,
            )}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-20 pointer-events-none"
                 style={{ background: `radial-gradient(ellipse at top left, currentColor 0%, transparent 60%)` }} />

            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', `bg-${text.replace('text-', '')}/10`)}>
                <Icon className={cn('w-4 h-4', text)} />
              </div>
              {change && (
                <div className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{change}</span>
                </div>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground leading-tight">
              {key === 'avgScore' || key === 'avgCredibility'
                ? String(value)
                : typeof value === 'number'
                  ? value.toLocaleString()
                  : value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>

            {/* Score bar for numeric metrics */}
            {(key === 'avgScore' || key === 'avgCredibility') && (
              <div className="mt-2 score-bar">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${key === 'avgScore' ? (Number(value) / 100) * 100 : (Number(value) / 10) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                  className={cn('score-bar-fill', text.replace('text-', 'bg-'))}
                />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Pipeline funnel card (full-width on small, 4th col on large) */}
      {summary && (
        <motion.div
          variants={item}
          className="col-span-2 lg:col-span-4 glass rounded-xl border border-white/[0.08] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pipeline Funnel
            </p>
            {survivalRate !== null && (
              <span className="text-xs text-emerald-400 font-medium">
                {survivalRate}% survival rate
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'Input',         value: summary.total_input,    color: 'bg-slate-400' },
              { label: 'After Dedup',   value: summary.after_dedup,    color: 'bg-blue-400' },
              { label: 'Relevant',      value: summary.after_relevance,color: 'bg-violet-400' },
              { label: 'Final',         value: summary.final_count,    color: 'bg-emerald-400' },
            ].map(({ label, value, color }, i, arr) => (
              <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground truncate">{label}</span>
                    <span className="text-xs font-bold text-foreground">{value}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(value / summary.total_input) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', color)}
                    />
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground text-xs flex-shrink-0">→</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
