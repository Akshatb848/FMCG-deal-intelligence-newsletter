'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import type { Article } from '@/types';

interface CompanyTrendsProps {
  articles: Article[];
}

const BRANDS = [
  'Reuters', 'Bloomberg', 'Financial Times', 'CNBC',
  'Wall Street Journal', 'Economic Times', 'Forbes', 'BBC',
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E', '#64748B', '#E879F9'];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl
                    backdrop-blur-xl text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">{payload[0].value} articles</p>
    </div>
  );
};

export function CompanyTrends({ articles }: CompanyTrendsProps) {
  const data = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    articles.forEach((a) => {
      sourceCounts[a.source] = (sourceCounts[a.source] ?? 0) + 1;
    });
    return Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [articles]);

  const avgScore = useMemo(() => {
    if (!articles.length) return {};
    const bySource: Record<string, number[]> = {};
    articles.forEach((a) => {
      (bySource[a.source] ??= []).push(a.relevance_score);
    });
    return Object.fromEntries(
      Object.entries(bySource).map(([src, scores]) => [
        src,
        Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10,
      ])
    );
  }, [articles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass rounded-xl border border-white/[0.08] p-4"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Articles by Source</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Top contributing outlets in the pipeline</p>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 24 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(215 25% 55%)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              angle={-30}
              textAnchor="end"
            />
            <YAxis
              tick={{ fill: 'hsl(215 25% 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Avg score table */}
      <div className="mt-4 space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          Avg Relevance Score by Source
        </p>
        {data.slice(0, 5).map(({ name, color }) => (
          <div key={name} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-muted-foreground flex-1 truncate">{name}</span>
            <span className="text-xs font-semibold text-foreground">
              {avgScore[name] ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
