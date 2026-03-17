'use client';

import { motion } from 'framer-motion';
import { Play, TrendingUp, Zap, Globe2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onRunPipeline?: () => void;
  isRunning?: boolean;
  totalDeals?: number;
  activeSectors?: number;
  lastUpdated?: string;
}

// ── Animated background orbs ─────────────────────────────────────────────────

function AmbientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary blue orb */}
      <div
        className="orb orb-blue absolute"
        style={{
          width: '60%', height: '80%',
          top: '-20%', left: '-10%',
          animationDelay: '0s',
          animationDuration: '10s',
        }}
      />
      {/* Violet accent orb */}
      <div
        className="orb orb-violet absolute"
        style={{
          width: '40%', height: '60%',
          top: '-10%', right: '5%',
          animationDelay: '-3s',
          animationDuration: '12s',
        }}
      />
      {/* Cyan accent orb */}
      <div
        className="orb orb-cyan absolute"
        style={{
          width: '30%', height: '40%',
          bottom: '-5%', left: '30%',
          animationDelay: '-6s',
          animationDuration: '9s',
        }}
      />
    </div>
  );
}

// ── Floating particles ────────────────────────────────────────────────────────

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 4,
    duration: 4 + Math.random() * 6,
    color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── Animated grid lines ────────────────────────────────────────────────────────

function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)',
      }}
    />
  );
}

// ── Live indicator ────────────────────────────────────────────────────────────

function LiveIndicator() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                    bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs font-semibold text-emerald-400">System Active</span>
      <span className="w-px h-3 bg-emerald-500/30" />
      <span className="text-[10px] text-emerald-400/70">AI Engine v2.0</span>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass backdrop-blur-sm">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
           style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-bold text-foreground leading-none" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

// ── Main hero ─────────────────────────────────────────────────────────────────

export function HeroSection({ onRunPipeline, isRunning, totalDeals = 24, lastUpdated }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl min-h-[280px] flex items-center"
         style={{ background: 'linear-gradient(135deg, rgba(6,12,26,0.95) 0%, rgba(10,14,28,0.98) 100%)' }}>

      {/* Animated layers */}
      <AmbientOrbs />
      <GridOverlay />
      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 w-full px-6 md:px-10 py-10">
        <div className="max-w-3xl">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <LiveIndicator />
          </motion.div>

          {/* Main title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-3">
              <span className="text-foreground">FMCG Deal</span>
              <br />
              <span className="gradient-text">Intelligence Engine</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
              Real-time AI-generated insights on FMCG investments & M&amp;A — powered by a
              7-stage autonomous pipeline that ingests, filters, scores, and summarizes
              deal activity into actionable intelligence.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex items-center gap-3 mt-6 flex-wrap"
          >
            <button
              onClick={onRunPipeline}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold',
                'transition-all duration-300 border',
                isRunning
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-violet-600 border-transparent text-white',
                !isRunning && 'hover:shadow-neon-blue hover:scale-[1.02] active:scale-100',
              )}
            >
              {isRunning ? (
                <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Running Pipeline…</>
              ) : (
                <><Play className="w-3.5 h-3.5" />Run Intelligence Pipeline</>
              )}
            </button>

            <Link
              href="/newsletter"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                         glass border border-white/10 text-muted-foreground
                         hover:text-foreground hover:border-white/20 transition-all duration-200"
            >
              View Newsletter <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-2 mt-6"
          >
            <StatChip icon={TrendingUp} label="Active Deals"    value={totalDeals}    color="#60a5fa" />
            <StatChip icon={Zap}        label="Pipeline Stages" value="7 Stages"      color="#a78bfa" />
            <StatChip icon={Globe2}     label="Source Tiers"    value="3 Tiers"       color="#34d399" />
          </motion.div>
        </div>
      </div>

      {/* Right side decorative element */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="w-32 h-32 rounded-full border border-blue-500/10"
          style={{ boxShadow: 'inset 0 0 40px rgba(59,130,246,0.08)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border border-violet-500/10"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-8 rounded-full border border-cyan-500/15"
          style={{ boxShadow: 'inset 0 0 20px rgba(6,182,212,0.1)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center glow-blue">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
