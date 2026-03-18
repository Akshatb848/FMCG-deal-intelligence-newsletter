'use client';

import { motion } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { DealType } from '@/types';

interface CategoryChartProps {
  data?: Record<string, number> | null;
  isLoading?: boolean;
}

const COLORS: Record<string, string> = {
  Acquisition:       '#3B82F6',
  Merger:            '#8B5CF6',
  Investment:        '#10B981',
  Divestiture:       '#F43F5E',
  'Stake Acquisition': '#06B6D4',
  'Joint Venture':   '#F59E0B',
  Other:             '#64748B',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="glass rounded-xl border border-white/[0.08] p-4 animate-pulse">
      <div className="mb-4">
        <div className="h-4 w-40 bg-white/[0.06] rounded mb-2" />
        <div className="h-3 w-28 bg-white/[0.04] rounded" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-44 h-44 rounded-full bg-white/[0.04] flex-shrink-0" />
        <div className="flex-1 space-y-3">
          {[80, 60, 50, 40, 35].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
              <div className="h-3 bg-white/[0.05] rounded flex-1" style={{ maxWidth: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-xl border border-white/[0.08] p-4 flex flex-col items-center justify-center min-h-[240px] gap-2"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-lg">📊</span>
      </div>
      <p className="text-sm font-semibold text-foreground">No deal type data</p>
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Run the pipeline to populate this chart with live deal intelligence data.
      </p>
    </motion.div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string; pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { color, pct } } = payload[0];
  return (
    <div className="bg-card/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl backdrop-blur-xl text-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-foreground font-semibold">{name}</span>
      </div>
      <p className="text-muted-foreground">{value} deals · {pct}%</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CategoryChart({ data, isLoading = false }: CategoryChartProps) {
  // ── Guard: loading state ──────────────────────────────────────────────────
  if (isLoading) return <ChartSkeleton />;

  // ── Guard: null / undefined / non-object data ────────────────────────────
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CategoryChart] received invalid data:', data);
    }
    return <EmptyState />;
  }

  const entries = Object.entries(data);

  // ── Guard: empty data ─────────────────────────────────────────────────────
  if (entries.length === 0) return <EmptyState />;

  const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
  if (total === 0) return <EmptyState />;

  const chartData = entries
    .map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      color: COLORS[name as DealType] ?? COLORS['Other'],
      pct: Math.round(((Number(value) || 0) / total) * 100),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-xl border border-white/[0.08] p-4"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Deal Type Distribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{total} total deals processed</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Pie chart */}
        <div className="h-44 w-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {chartData.map(({ name, value, color, pct }) => (
            <div key={name} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{name}</span>
              <div className="flex items-center gap-2">
                <div className="w-14 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-4 text-right">{value}</span>
                <span className="text-[10px] text-muted-foreground w-7 text-right">{pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
