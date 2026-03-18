'use client';

import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FileText, RefreshCw, Play, AlertCircle, Loader2,
  ChevronDown, ExternalLink, Copy, Check, Download,
  FileSpreadsheet, FileDown, Table2,
} from 'lucide-react';
import type { Newsletter, NewsletterHighlight, NewsletterDeal } from '@/types';
import { DEAL_TYPE_CONFIG } from '@/lib/utils';
import { MOCK_NEWSLETTER } from '@/lib/mockData';
import { NeonBadge, SectionHeader } from '@/components/ui/GlowCard';
import { SafeWidget } from '@/components/ui/ErrorBoundary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { triggerDownload } from '@/lib/api';

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchNewsletter(): Promise<Newsletter> {
  try {
    const res = await fetch('/api/newsletter', { signal: AbortSignal.timeout?.(12_000) });
    if (!res.ok) {
      if (res.status === 404) return MOCK_NEWSLETTER;
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    // Validate shape before returning
    if (!data?.header || !Array.isArray(data?.all_deals)) return MOCK_NEWSLETTER;
    return data;
  } catch {
    return MOCK_NEWSLETTER;
  }
}

async function triggerPipeline(): Promise<{ job_id: string }> {
  const res = await fetch('/api/run-pipeline', { method: 'POST' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// ── Deal type badge ───────────────────────────────────────────────────────────

function DealBadge({ type }: { type: string }) {
  const cfg = DEAL_TYPE_CONFIG[type as keyof typeof DEAL_TYPE_CONFIG] ?? DEAL_TYPE_CONFIG.Other;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.bg, cfg.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span className={cfg.color}>{type}</span>
    </span>
  );
}

// ── Highlight card ────────────────────────────────────────────────────────────

function HighlightCard({ item, rank }: { item: NewsletterHighlight; rank: number }) {
  const gradients = [
    'from-yellow-500/10 to-amber-500/5 border-yellow-500/20',
    'from-slate-400/8 to-slate-300/4 border-white/10',
    'from-orange-700/8 to-orange-500/4 border-orange-500/15',
  ];

  const rankColors = ['#fbbf24', '#94a3b8', '#f97316'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={cn(
        'flex flex-col gap-3 p-4 rounded-xl border bg-gradient-to-br card-lift',
        gradients[rank] ?? 'from-blue-500/8 to-blue-500/4 border-blue-500/15',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
             style={{ background: `${rankColors[rank]}20`, color: rankColors[rank], border: `1px solid ${rankColors[rank]}40` }}>
          {rank + 1}
        </div>
        <DealBadge type={item.deal_type} />
      </div>

      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{item.title}</h3>

      <div className="flex flex-wrap gap-1.5">
        {item.company && (
          <NeonBadge color="blue" size="xs" dot>{item.company}</NeonBadge>
        )}
        {item.deal_value && (
          <NeonBadge color="green" size="xs" dot>{item.deal_value}</NeonBadge>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{item.summary}</p>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <span className="text-[10px] text-muted-foreground">{item.source} · {item.published_date}</span>
        <div className="flex items-center gap-2">
          <NeonBadge color="violet" size="xs">{item.relevance_score}</NeonBadge>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
               className="text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Deal row ──────────────────────────────────────────────────────────────────

function DealRow({ deal, idx }: { deal: NewsletterDeal; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 py-2.5 px-1 hover:bg-white/[0.02] rounded-lg transition-colors text-left">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-semibold text-foreground">{deal.company}</span>
            <DealBadge type={deal.deal_type} />
            {deal.deal_value && <NeonBadge color="green" size="xs">{deal.deal_value}</NeonBadge>}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{deal.summary}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground hidden sm:block">{deal.source}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/50 transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-3 text-xs text-muted-foreground space-y-1">
              <p>{deal.summary}</p>
              <div className="flex items-center gap-3 text-[10px] mt-1">
                <span>{deal.source} · {deal.published_date}</span>
                <NeonBadge color="blue" size="xs">Score {deal.relevance_score}</NeonBadge>
                {deal.url && <a href={deal.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">Source <ExternalLink className="w-2.5 h-2.5" /></a>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pipeline log ──────────────────────────────────────────────────────────────

function PipelineLog({ steps }: { steps: Newsletter['pipeline_summary'] }) {
  const colors = ['#60a5fa', '#a78bfa', '#22d3ee', '#34d399', '#fb923c', '#f472b6', '#818cf8'];
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
               style={{ background: `${colors[i % colors.length]}20`, border: `1px solid ${colors[i % colors.length]}35`, color: colors[i % colors.length] }}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{step.stage}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{step.input} → {step.output}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{step.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const { data: newsletter, isLoading, isError, error, refetch, isFetching } =
    useQuery<Newsletter>({ queryKey: ['newsletter'], queryFn: fetchNewsletter, staleTime: 5 * 60 * 1000, retry: 1 });

  const [copied, setCopied] = useState(false);

  const handleRunPipeline = async () => {
    try {
      const { job_id } = await triggerPipeline();
      toast.success(`Pipeline started (${job_id.slice(0,8)}…)`, { description: 'Refresh in ~15s.' });
    } catch { toast.error('Could not start pipeline'); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newsletter?.text ?? '').then(() => {
      setCopied(true); toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = async (fmt: 'csv' | 'xlsx' | 'docx') => {
    try {
      await triggerDownload(fmt);
      toast.success(`Downloaded ${fmt.toUpperCase()}`, { description: 'File saved to your downloads folder.' });
    } catch {
      toast.error(`Export failed — run the pipeline first`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" style={{ color: '#60a5fa' }} />
            <h1 className="text-xl font-bold text-foreground">Intelligence Brief</h1>
          </div>
          <p className="text-sm text-muted-foreground">Daily structured newsletter from the AI pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
            <Play className="w-3 h-3" />Run Pipeline
          </button>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {isLoading && <div className="h-40 shimmer rounded-xl" />}

      {isError && !newsletter && (
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="font-semibold text-foreground">No newsletter yet</p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message}</p>
          </div>
          <button onClick={handleRunPipeline}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
            <Play className="w-4 h-4" />Run Pipeline Now
          </button>
        </div>
      )}

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />Refreshing…
        </div>
      )}

      {newsletter && (
        <div className="space-y-5">
          {/* Banner */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08), transparent)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <NeonBadge color="blue" size="sm" dot className="mb-2">Intelligence Brief</NeonBadge>
                <h2 className="text-lg font-bold text-foreground">{newsletter.header}</h2>
                <p className="text-sm text-muted-foreground mt-1">{newsletter.date} · {newsletter.total_deals} deals</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass border border-white/10 hover:bg-white/10 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => handleExport('csv')}
                  title="Download CSV"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: 'rgba(34,211,238,0.10)', borderColor: 'rgba(34,211,238,0.25)', color: '#22d3ee' }}>
                  <Table2 className="w-3 h-3" />CSV
                </button>
                <button onClick={() => handleExport('xlsx')}
                  title="Download Excel"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.25)', color: '#34d399' }}>
                  <FileSpreadsheet className="w-3 h-3" />Excel
                </button>
                <button onClick={() => handleExport('docx')}
                  title="Download Word"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                  <FileDown className="w-3 h-3" />Word
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(newsletter.deal_type_breakdown ?? {}).map(([type, count]) => (
                <div key={type} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{type}</p>
                  <p className="text-xl font-black gradient-text-primary">{count}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Key Highlights */}
          <div>
            <SectionHeader title="Key Highlights" subtitle={`Top ${newsletter.key_highlights?.length ?? 0} deals by relevance`} accent="amber" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(newsletter.key_highlights ?? []).map((h, i) => (
                <SafeWidget key={i} label={`Highlight ${i + 1}`}>
                  <HighlightCard item={h} rank={i} />
                </SafeWidget>
              ))}
            </div>
          </div>

          {/* All Deals */}
          <div>
            <SectionHeader title={`All Deals (${newsletter.all_deals.length})`} subtitle="Expandable · click to see full details" accent="blue" />
            <div className="glass rounded-xl p-4">
              {newsletter.all_deals.map((deal, i) => <DealRow key={i} deal={deal} idx={i} />)}
            </div>
          </div>

          {/* Insights */}
          <div>
            <SectionHeader title="Insights & Trends" subtitle="AI-derived from deal activity patterns" accent="green" />
            <div className="glass rounded-xl p-4 space-y-3">
              {newsletter.insights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3">
                  <span className="w-1 h-full min-h-[20px] rounded-full flex-shrink-0 mt-1"
                        style={{ background: 'linear-gradient(to bottom, #60a5fa, #a78bfa)' }} />
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pipeline log */}
          <div>
            <SectionHeader title="Pipeline Execution Log" subtitle="7-stage agent execution trace" accent="violet" />
            <div className="glass rounded-xl p-4">
              <PipelineLog steps={newsletter.pipeline_summary} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
