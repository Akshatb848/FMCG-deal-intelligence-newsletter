'use client';

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import type { TrendPoint } from '@/types';

interface TrendChartProps {
  data: TrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 border border-white/10 rounded-lg px-3 py-2.5 shadow-xl
                    backdrop-blur-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ data }: TrendChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl border border-white/[0.08] p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Deal Activity Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Weekly deal volume over the past 10 weeks</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {[
            { key: 'acquisitions', color: '#3B82F6', label: 'Acquisitions' },
            { key: 'investments',  color: '#10B981', label: 'Investments'  },
            { key: 'divestitures', color: '#F43F5E', label: 'Divestitures' },
          ].map(({ key, color, label }) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              {[
                { id: 'acquisitions', color: '#3B82F6' },
                { id: 'investments',  color: '#10B981' },
                { id: 'divestitures', color: '#F43F5E' },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(215 25% 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(215 25% 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="acquisitions"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#grad-acquisitions)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="investments"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#grad-investments)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="divestitures"
              stroke="#F43F5E"
              strokeWidth={2}
              fill="url(#grad-divestitures)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
