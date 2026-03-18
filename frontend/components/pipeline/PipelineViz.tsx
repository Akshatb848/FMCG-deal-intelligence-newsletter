'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, GitMerge, Filter, ShieldCheck,
  Brain, Newspaper, Download, ChevronDown,
  CheckCircle2, Loader2, Circle, AlertTriangle,
  ArrowRight, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type StageStatus = 'idle' | 'running' | 'complete' | 'error';

interface PipelineStage {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  glowClass: string;
  description: string;
  details: string;
  inputLabel: string;
  outputLabel: string;
}

export interface PipelineProgress {
  stage: string;
  input: number;
  output: number;
  message: string;
}

interface PipelineVizProps {
  isRunning?: boolean;
  isComplete?: boolean;
  progress?: PipelineProgress[];
  onRunPipeline?: () => void;
  className?: string;
}

// ── Stage definitions ──────────────────────────────────────────────────────────

const STAGES: PipelineStage[] = [
  {
    id: 'ingestion',
    label: 'Ingestion',
    shortLabel: 'Ingest',
    icon: Database,
    color: '#60a5fa',
    glowClass: 'glow-blue',
    description: 'Load & normalize raw CSV/JSON records',
    details: 'Reads source files, normalizes column names, parses dates across 9 formats, and assigns stable IDs.',
    inputLabel: 'Raw file',
    outputLabel: 'Normalized records',
  },
  {
    id: 'dedup',
    label: 'De-duplication',
    shortLabel: 'Dedup',
    icon: GitMerge,
    color: '#a78bfa',
    glowClass: 'glow-violet',
    description: 'Remove exact & near-duplicate records',
    details: 'Exact dedup via canonical title hash, then near-dedup via TF-IDF cosine similarity (threshold 0.85). Keeps most informative entry.',
    inputLabel: 'All records',
    outputLabel: 'Unique records',
  },
  {
    id: 'relevance',
    label: 'Relevance Filter',
    shortLabel: 'Relevance',
    icon: Filter,
    color: '#22d3ee',
    glowClass: 'glow-cyan',
    description: 'Score & filter FMCG deal relevance',
    details: 'Primary keyword score (FMCG entities) + deal activity keywords + recency bonus. Drops off-topic records below threshold.',
    inputLabel: 'Unique records',
    outputLabel: 'Relevant records',
  },
  {
    id: 'credibility',
    label: 'Credibility',
    shortLabel: 'Credibility',
    icon: ShieldCheck,
    color: '#34d399',
    glowClass: 'glow-green',
    description: 'Score source credibility (0–9)',
    details: '3-tier source whitelist: Tier 1 (Reuters, Bloomberg) → 9pts. Hard-blocks known unreliable sources.',
    inputLabel: 'Relevant records',
    outputLabel: 'Credible records',
  },
  {
    id: 'link_validation',
    label: 'Link Validation',
    shortLabel: 'Links',
    icon: Link2,
    color: '#06b6d4',
    glowClass: 'glow-cyan',
    description: 'Validate all source URLs',
    details: 'Checks URL format, domain whitelist, and HTTP status (200 only). Removes records with broken, redirected, or placeholder links. Trusted domains bypass network errors.',
    inputLabel: 'Credible records',
    outputLabel: 'Link-valid records',
  },
  {
    id: 'summarization',
    label: 'Summarization',
    shortLabel: 'Summarize',
    icon: Brain,
    color: '#fb923c',
    glowClass: 'glow-amber',
    description: 'Generate 2-line AI summaries',
    details: 'Extractive summarization: selects top-scoring sentences, extracts company name and deal value from each article.',
    inputLabel: 'Scored records',
    outputLabel: 'Enriched records',
  },
  {
    id: 'newsletter_gen',
    label: 'Newsletter',
    shortLabel: 'Newsletter',
    icon: Newspaper,
    color: '#f472b6',
    glowClass: 'glow-rose',
    description: 'Generate structured intelligence brief',
    details: 'Builds header, top-3 highlights, all-deals list, and trend insights. Derives insights from deal-type mix and keyword patterns.',
    inputLabel: 'Enriched records',
    outputLabel: 'Newsletter brief',
  },
  {
    id: 'newsletter',
    label: 'Output',
    shortLabel: 'Output',
    icon: Download,
    color: '#818cf8',
    glowClass: 'glow-violet',
    description: 'Export JSON, CSV, Excel, Word',
    details: 'Generates Excel with 4 tabs (Report, Summary, All Records, Pipeline Log) + processed_articles.json + processed_articles.csv + Newsletter.docx. All URLs are clickable hyperlinks.',
    inputLabel: 'All data',
    outputLabel: '4 output files',
  },
];

// ── Connector component ───────────────────────────────────────────────────────

function Connector({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <div className="flex-shrink-0 flex items-center mx-1">
      {/* Desktop: horizontal connector */}
      <div className="hidden lg:flex items-center w-10">
        <div className={cn(
          'relative h-px flex-1 overflow-hidden rounded-full',
          complete ? 'bg-emerald-500/40' : active ? 'bg-blue-500/40' : 'bg-white/[0.08]',
        )}>
          {(active || complete) && (
            <div className={cn(
              'absolute inset-0 pipeline-connector',
              complete && 'pipeline-connector-active',
            )} />
          )}
        </div>
        <ArrowRight className={cn(
          'w-3 h-3 flex-shrink-0 -ml-0.5',
          complete ? 'text-emerald-500/60' : active ? 'text-blue-500/60' : 'text-white/10',
        )} />
      </div>
      {/* Mobile: vertical connector */}
      <div className="flex lg:hidden w-px h-6 relative overflow-hidden mx-auto">
        <div className={cn(
          'w-full h-full',
          complete ? 'bg-emerald-500/30' : active ? 'bg-blue-500/30' : 'bg-white/[0.08]',
        )} />
      </div>
    </div>
  );
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status, color }: { status: StageStatus; color: string }) {
  if (status === 'complete') return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34d399' }} />;
  if (status === 'running')  return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color }} />;
  if (status === 'error')    return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
  return <Circle className="w-3 h-3 text-white/20" />;
}

// ── Single pipeline node ──────────────────────────────────────────────────────

function PipelineNode({
  stage, status, progress, isExpanded, onToggle, index,
}: {
  stage: PipelineStage;
  status: StageStatus;
  progress?: PipelineProgress;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const Icon = stage.icon;

  const bgByStatus: Record<StageStatus, string> = {
    idle:     'bg-white/[0.03]',
    running:  'bg-blue-500/[0.08]',
    complete: 'bg-emerald-500/[0.06]',
    error:    'bg-rose-500/[0.08]',
  };

  const ringByStatus: Record<StageStatus, string> = {
    idle:     'border-white/10',
    running:  'node-running',
    complete: 'node-complete',
    error:    'node-error',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="flex flex-col items-center min-w-0 relative"
    >
      {/* Node card */}
      <button
        onClick={onToggle}
        className={cn(
          'relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300',
          'hover:scale-105 active:scale-100 cursor-pointer group w-[88px] lg:w-[96px]',
          bgByStatus[status],
          ringByStatus[status],
        )}
        style={{
          boxShadow: status === 'complete'
            ? `0 0 16px rgba(16,185,129,0.25)`
            : status === 'running'
            ? `0 0 20px rgba(59,130,246,0.35), 0 0 6px rgba(59,130,246,0.2)`
            : 'none',
        }}
      >
        {/* Step number */}
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-background border border-white/10
                         text-[8px] font-bold text-muted-foreground flex items-center justify-center">
          {index + 1}
        </span>

        {/* Icon ring */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300',
            status === 'running'  && 'animate-pulse',
          )}
          style={{
            background: `linear-gradient(135deg, ${stage.color}20, ${stage.color}08)`,
            border: `1px solid ${stage.color}30`,
            boxShadow: (status === 'running' || status === 'complete')
              ? `0 0 12px ${stage.color}40` : 'none',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: stage.color }} />
        </div>

        {/* Label */}
        <span className={cn(
          'text-[10px] font-semibold text-center leading-tight transition-colors',
          status === 'complete' ? 'text-emerald-400' :
          status === 'running'  ? 'text-blue-400' :
          'text-muted-foreground group-hover:text-foreground',
        )}>
          {stage.shortLabel}
        </span>

        {/* Status icon */}
        <StatusIcon status={status} color={stage.color} />

        {/* Expand indicator */}
        <ChevronDown className={cn(
          'w-3 h-3 text-muted-foreground/40 transition-transform',
          isExpanded && 'rotate-180',
        )} />
      </button>

      {/* Counts badge */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold"
          style={{
            background: `${stage.color}18`,
            color: stage.color,
            border: `1px solid ${stage.color}25`,
          }}
        >
          {progress.input}→{progress.output}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Expanded detail panel ────────────────────────────────────────────────────

function StageDetail({ stage, progress }: { stage: PipelineStage; progress?: PipelineProgress }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div
        className="mt-4 p-4 rounded-xl border"
        style={{
          background: `linear-gradient(135deg, ${stage.color}08, transparent)`,
          borderColor: `${stage.color}20`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${stage.color}20`, border: `1px solid ${stage.color}30` }}
          >
            <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-1">{stage.label}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{stage.details}</p>

            {progress && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Input:</span>
                  <span className="text-xs font-semibold text-foreground">{progress.input}</span>
                </div>
                <div className="w-8 h-px bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Output:</span>
                  <span className="text-xs font-semibold" style={{ color: stage.color }}>{progress.output}</span>
                </div>
                {progress.input > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {Math.round((progress.output / progress.input) * 100)}% retained
                  </span>
                )}
              </div>
            )}

            {progress?.message && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">{progress.message}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main PipelineViz component ────────────────────────────────────────────────

export function PipelineViz({
  isRunning = false,
  isComplete = false,
  progress = [],
  onRunPipeline,
  className,
}: PipelineVizProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentRunningIdx, setCurrentRunningIdx] = useState(-1);

  // Determine which stage is currently running from progress
  useEffect(() => {
    if (!isRunning) { setCurrentRunningIdx(-1); return; }
    const lastProgress = progress[progress.length - 1];
    if (!lastProgress) { setCurrentRunningIdx(0); return; }
    const idx = STAGES.findIndex(s => s.id === lastProgress.stage);
    setCurrentRunningIdx(idx + 1 < STAGES.length ? idx + 1 : -1);
  }, [isRunning, progress]);

  const getStatus = (stage: PipelineStage, idx: number): StageStatus => {
    const hasProgress = progress.some(p => p.stage === stage.id);
    if (hasProgress) return 'complete';
    if (isRunning && idx === currentRunningIdx) return 'running';
    if (isComplete) return 'complete';
    return 'idle';
  };

  const getProgress = (stage: PipelineStage) =>
    progress.find(p => p.stage === stage.id);

  const completedCount = progress.length;
  const totalCount = STAGES.length;
  const overallPct = isComplete ? 100 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-400 to-violet-500 inline-block" />
            Agent Pipeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            8-stage intelligence extraction · click any node for details
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall progress */}
          {(isRunning || isComplete) && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    isComplete
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-gradient-to-r from-blue-500 to-violet-500',
                  )}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{overallPct}%</span>
            </div>
          )}

          {/* Run button */}
          {onRunPipeline && (
            <button
              onClick={onRunPipeline}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                'transition-all duration-200 border',
                isRunning
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-not-allowed'
                  : isComplete
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 border-blue-500/30 text-blue-400 hover:from-blue-500/30 hover:to-violet-500/30',
              )}
            >
              {isRunning ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
              ) : isComplete ? (
                <><CheckCircle2 className="w-3 h-3" />Re-run</>
              ) : (
                <><Database className="w-3 h-3" />Run Pipeline</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pipeline nodes */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden">
        {/* Subtle scan animation overlay when running */}
        {isRunning && (
          <div className="absolute inset-0 scanline pointer-events-none overflow-hidden rounded-2xl" />
        )}

        <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-y-4 overflow-x-auto no-scrollbar">
          {STAGES.map((stage, idx) => {
            const status = getStatus(stage, idx);
            const prog = getProgress(stage);
            const isLast = idx === STAGES.length - 1;

            return (
              <div key={stage.id} className="flex items-center">
                <PipelineNode
                  stage={stage}
                  status={status}
                  progress={prog}
                  isExpanded={expandedId === stage.id}
                  onToggle={() => setExpandedId(expandedId === stage.id ? null : stage.id)}
                  index={idx}
                />
                {!isLast && (
                  <Connector
                    active={status === 'running' || status === 'complete'}
                    complete={status === 'complete'}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded stage detail */}
        <AnimatePresence>
          {expandedId && (
            <StageDetail
              key={expandedId}
              stage={STAGES.find(s => s.id === expandedId)!}
              progress={progress.find(p => p.stage === expandedId)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Stage legend strip */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Idle',     color: 'bg-white/10',        dot: 'bg-white/20' },
          { label: 'Running',  color: 'bg-blue-500/10',     dot: 'bg-blue-400' },
          { label: 'Complete', color: 'bg-emerald-500/10',  dot: 'bg-emerald-400' },
          { label: 'Error',    color: 'bg-rose-500/10',     dot: 'bg-rose-400' },
        ].map(({ label, color, dot }) => (
          <div key={label} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-muted-foreground', color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
            {label}
          </div>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="text-blue-400 font-mono">{completedCount}</span>/{totalCount} stages
        </div>
      </div>
    </div>
  );
}
