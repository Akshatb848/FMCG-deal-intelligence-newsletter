'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Newspaper, TrendingUp, Star, ChevronDown, ExternalLink,
  Award, BarChart2, Lightbulb, Download, Copy, Check, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import type { Newsletter, NewsletterHighlight, NewsletterDeal } from '@/types';
import { cn } from '@/lib/utils';
import { DEAL_TYPE_CONFIG } from '@/lib/utils';
import { toast } from 'sonner';

// ── Deal type badge ──────────────────────────────────────────────────────────

function DealBadge({ type }: { type: string }) {
  const cfg = DEAL_TYPE_CONFIG[type as keyof typeof DEAL_TYPE_CONFIG] ?? DEAL_TYPE_CONFIG.Other;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.bg, cfg.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span className={cfg.color}>{type}</span>
    </span>
  );
}

// ── Key Highlight Card ───────────────────────────────────────────────────────

function HighlightCard({ item, rank }: { item: NewsletterHighlight; rank: number }) {
  const rankColors = ['from-yellow-500 to-amber-400', 'from-slate-400 to-slate-300', 'from-orange-700 to-orange-500'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className="glass rounded-xl p-5 flex flex-col gap-3 hover:bg-white/[0.06] transition-colors"
    >
      {/* Rank + deal type */}
      <div className="flex items-center justify-between">
        <div className={cn(
          'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-black text-white',
          rankColors[rank] ?? 'from-blue-500 to-violet-500',
        )}>
          {rank + 1}
        </div>
        <DealBadge type={item.deal_type} />
      </div>

      {/* Title — clickable link */}
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-semibold text-foreground leading-snug line-clamp-2
                     hover:text-primary hover:underline transition-colors"
        >
          {item.title}
          <ExternalLink className="inline w-3 h-3 ml-1 opacity-50" />
        </a>
      ) : (
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {item.title}
        </h3>
      )}

      {/* Company + value */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.company && (
          <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
            {item.company}
          </span>
        )}
        {item.deal_value && (
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            {item.deal_value}
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {item.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground font-medium">{item.source}</span>
          <span className="text-[10px] text-muted-foreground">{item.published_date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-primary">Score {item.relevance_score}</span>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
               title="Open original source">
              <ExternalLink className="w-3 h-3" />
              Source
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── All Deals Row ─────────────────────────────────────────────────────────────

function DealRow({ deal, idx }: { deal: NewsletterDeal; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="border-b border-white/[0.05] last:border-0"
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 py-3 px-1 hover:bg-white/[0.03] rounded-lg transition-colors text-left"
      >
        {/* Bullet dot */}
        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-semibold text-foreground">{deal.company}</span>
            <DealBadge type={deal.deal_type} />
            {deal.deal_value && (
              <span className="text-[10px] text-emerald-400 font-medium">{deal.deal_value}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{deal.summary}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            {deal.source}
          </span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3 text-xs text-muted-foreground leading-relaxed space-y-1">
              <p>{deal.summary}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px]">
                <span>{deal.source} · {deal.published_date}</span>
                <span className="text-primary">Score {deal.relevance_score}</span>
                {deal.url && (
                  <a href={deal.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-blue-400 hover:underline">
                    Source <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineLog({ steps }: { steps: Newsletter['pipeline_summary'] }) {
  const stageColors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500',
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={cn('w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5', stageColors[i % stageColors.length])}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{step.stage}</span>
              <span className="text-[10px] text-muted-foreground">
                {step.input} → {step.output}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{step.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Newsletter View ──────────────────────────────────────────────────────

export function NewsletterView({ newsletter }: { newsletter: Newsletter }) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(newsletter.text ?? '').then(() => {
      setCopied(true);
      toast.success('Newsletter text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadText = () => {
    const blob = new Blob([newsletter.text ?? ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${newsletter.domain_name.replace(/\s+/g, '_')}_${newsletter.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Newsletter downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 bg-gradient-to-r from-blue-500/10 via-violet-500/5 to-transparent"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Intelligence Brief
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{newsletter.header}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {newsletter.date} · {newsletter.total_deals} deals analysed
            </p>
            {/* Link validation summary */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" />
                All links verified
              </span>
              {(newsletter.total_invalid_links_removed ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  {newsletter.total_invalid_links_removed} invalid links removed
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                         glass border border-white/10 hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
            <button
              onClick={downloadText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                         bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors text-primary"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(newsletter.deal_type_breakdown).map(([type, count]) => (
            <div key={type} className="bg-white/[0.04] rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{type}</p>
              <p className="text-lg font-bold text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Key Highlights */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Key Highlights — Top {newsletter.key_highlights.length} Deals
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {newsletter.key_highlights.map((h, i) => (
            <HighlightCard key={i} item={h} rank={i} />
          ))}
        </div>
      </section>

      {/* All Deals */}
      <section className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            All Deals ({newsletter.all_deals.length})
          </h2>
        </div>
        <div>
          {newsletter.all_deals.map((deal, i) => (
            <DealRow key={i} deal={deal} idx={i} />
          ))}
        </div>
      </section>

      {/* Insights */}
      <section className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Insights & Trends
          </h2>
        </div>
        <div className="space-y-3">
          {newsletter.insights.map((insight, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/40"
            >
              {insight}
            </motion.p>
          ))}
        </div>
      </section>

      {/* Pipeline Log */}
      <section className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Pipeline Execution Log
          </h2>
        </div>
        <PipelineLog steps={newsletter.pipeline_summary} />
      </section>
    </div>
  );
}
