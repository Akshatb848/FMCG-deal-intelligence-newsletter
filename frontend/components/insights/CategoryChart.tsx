'use client';

import { motion } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { cn, DEAL_TYPE_CONFIG } from '@/lib/utils';
import type { DealType } from '@/types';

interface CategoryChartProps {
  data: Record<string, number>;
}

const COLORS = {
  Acquisition:       '#3B82F6',
  Merger:            '#8B5CF6',
  Investment:        '#10B981',
  Divestiture:       '#F43F5E',
  'Stake Acquisition': '#06B6D4',
  'Joint Venture':   '#F59E0B',
  Other:             '#64748B',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { color } } = payload[0];
  return (
    <div className="bg-card/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl
                    backdrop-blur-xl text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-foreground font-medium">{name}</span>
        <span className="font-bold text-foreground ml-2">{value}</span>
      </div>
    </div>
  );
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    color: COLORS[name as DealType] ?? COLORS['Other'],
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-xl border border-white/[0.08] p-4"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Deal Type Distribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{total} total deals in pipeline</p>
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

        {/* Legend with percentages */}
        <div className="flex-1 space-y-2">
          {chartData.sort((a, b) => b.value - a.value).map(({ name, value, color }) => (
            <div key={name} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(value / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-3 text-right">{value}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {Math.round((value / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
