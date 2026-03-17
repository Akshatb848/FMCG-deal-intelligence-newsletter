'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

// ── GlowCard ──────────────────────────────────────────────────────────────────

type GlowColor = 'blue' | 'violet' | 'cyan' | 'green' | 'amber' | 'rose' | 'none';

const GLOW_CONFIG: Record<GlowColor, { border: string; shadow: string; bg: string }> = {
  blue:   { border: 'rgba(59,130,246,0.25)',  shadow: '0 0 24px rgba(59,130,246,0.2)',  bg: 'rgba(59,130,246,0.04)' },
  violet: { border: 'rgba(139,92,246,0.25)',  shadow: '0 0 24px rgba(139,92,246,0.2)',  bg: 'rgba(139,92,246,0.04)' },
  cyan:   { border: 'rgba(6,182,212,0.25)',   shadow: '0 0 24px rgba(6,182,212,0.2)',   bg: 'rgba(6,182,212,0.04)' },
  green:  { border: 'rgba(16,185,129,0.25)',  shadow: '0 0 24px rgba(16,185,129,0.2)',  bg: 'rgba(16,185,129,0.04)' },
  amber:  { border: 'rgba(245,158,11,0.25)',  shadow: '0 0 24px rgba(245,158,11,0.2)',  bg: 'rgba(245,158,11,0.04)' },
  rose:   { border: 'rgba(244,63,94,0.25)',   shadow: '0 0 24px rgba(244,63,94,0.2)',   bg: 'rgba(244,63,94,0.04)' },
  none:   { border: 'rgba(255,255,255,0.07)', shadow: 'none',                           bg: 'rgba(255,255,255,0.025)' },
};

interface GlowCardProps extends HTMLMotionProps<'div'> {
  glow?: GlowColor;
  hover?: boolean;
  noPadding?: boolean;
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ glow = 'none', hover = true, noPadding = false, className, children, ...props }, ref) => {
    const cfg = GLOW_CONFIG[glow];

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -2, boxShadow: cfg.shadow } : undefined}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-xl backdrop-blur-xl',
          !noPadding && 'p-4',
          className,
        )}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlowCard.displayName = 'GlowCard';

// ── NeonBadge ─────────────────────────────────────────────────────────────────

interface NeonBadgeProps {
  children: React.ReactNode;
  color?: GlowColor;
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const BADGE_COLORS: Record<GlowColor, { text: string; bg: string; border: string; dot: string }> = {
  blue:   { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  dot: '#60a5fa' },
  violet: { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  dot: '#a78bfa' },
  cyan:   { text: '#67e8f9', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)',   dot: '#22d3ee' },
  green:  { text: '#6ee7b7', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#34d399' },
  amber:  { text: '#fcd34d', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#fbbf24' },
  rose:   { text: '#fca5a5', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.25)',   dot: '#fb7185' },
  none:   { text: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.4)' },
};

const BADGE_SIZES = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function NeonBadge({ children, color = 'none', size = 'sm', dot = false, className }: NeonBadgeProps) {
  const cfg = BADGE_COLORS[color];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        BADGE_SIZES[size],
        className,
      )}
      style={{
        color: cfg.text,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />}
      {children}
    </span>
  );
}

// ── KPIMetric ─────────────────────────────────────────────────────────────────

interface KPIMetricProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ElementType;
  color?: GlowColor;
  subtext?: string;
}

export function KPIMetric({ label, value, change, positive, icon: Icon, color = 'blue', subtext }: KPIMetricProps) {
  const cfg = GLOW_CONFIG[color];
  const badgeCfg = BADGE_COLORS[color];

  return (
    <GlowCard glow={color} hover className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-foreground mt-1 leading-none"
             style={{ textShadow: `0 0 20px ${badgeCfg.dot}40` }}>
            {value}
          </p>
          {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${badgeCfg.border}` }}
        >
          <Icon className="w-4 h-4" style={{ color: badgeCfg.dot }} />
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
            positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10',
          )}>
            {positive ? '↑' : '↓'} {change}
          </span>
          <span className="text-[10px] text-muted-foreground">vs last run</span>
        </div>
      )}
    </GlowCard>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, accent = 'blue' }: {
  title: string; subtitle?: string; accent?: GlowColor;
}) {
  const accentColor = BADGE_COLORS[accent].dot;
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="w-1 h-5 rounded-full"
        style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}60)` }}
      />
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
