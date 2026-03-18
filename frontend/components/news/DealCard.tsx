'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Bookmark, BookmarkCheck, TrendingUp, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { cn, DEAL_TYPE_CONFIG, timeAgo, SOURCE_TIER_COLOR, SOURCE_TIER_LABEL, scoreColor } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import type { Article } from '@/types';

interface DealCardProps {
  article: Article;
  index?: number;
}

export function DealCard({ article, index = 0 }: DealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { saveArticle, unsaveArticle, isSaved } = useStore();
  const saved = isSaved(article.id);

  const cfg      = DEAL_TYPE_CONFIG[article.deal_type_detected] ?? DEAL_TYPE_CONFIG['Other'];
  const tierClr  = SOURCE_TIER_COLOR[article.source_tier ?? 0];
  const tierLbl  = SOURCE_TIER_LABEL[article.source_tier ?? 0];
  const sColor   = scoreColor(article.relevance_score);
  const hasValidUrl = article.url && article.url !== '#' && article.url.startsWith('http');
  const linkValid = article.link_valid;

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved) {
      unsaveArticle(article.id);
      toast.success('Removed from saved');
    } else {
      saveArticle(article);
      toast.success('Saved to bookmarks');
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'glass rounded-xl border border-white/[0.08] overflow-hidden',
        'hover:border-white/[0.14] transition-all duration-200',
        expanded && 'border-primary/20',
      )}
    >
      {/* Card header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          {/* Deal type indicator */}
          <div className={cn(
            'w-1 h-full min-h-[40px] rounded-full flex-shrink-0 self-stretch',
            cfg.dot.replace('bg-', 'bg-'),
          )} />

          <div className="flex-1 min-w-0">
            {/* Tags row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                cfg.bg, cfg.color, cfg.border,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                {article.deal_type_detected}
              </span>
              <span className={cn('text-[10px] font-medium', tierClr)}>
                {article.source} · {tierLbl}
              </span>
              {/* Link validity badge */}
              {linkValid === true && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
              {linkValid === false && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-400">
                  <XCircle className="w-3 h-3" />
                  Unverified
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {timeAgo(article.published_date)}
              </span>
            </div>

            {/* Title — clickable if valid URL */}
            {hasValidUrl ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block text-sm font-semibold text-foreground leading-snug mb-1.5
                           hover:text-primary hover:underline transition-colors"
              >
                {article.title}
                <ExternalLink className="inline w-3 h-3 ml-1 opacity-60" />
              </a>
            ) : (
              <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5">
                {article.title}
              </h3>
            )}

            {/* Summary preview */}
            {!expanded && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {article.summary}
              </p>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-4 mt-3 ml-4">
          {[
            { label: 'Domain',       value: article.score_domain,      max: 40 },
            { label: 'Deal',         value: article.score_deal,        max: 40 },
            { label: 'Credibility',  value: article.credibility_score, max: 10 },
          ].map(({ label, value, max }) => (
            <div key={label} className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
              <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(value / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', cfg.dot)}
                />
              </div>
              <span className="text-[10px] font-semibold text-foreground">{value.toFixed(0)}</span>
            </div>
          ))}

          {/* Total score */}
          <div className="ml-auto flex items-center gap-1">
            <TrendingUp className={cn('w-3 h-3', sColor)} />
            <span className={cn('text-xs font-bold', sColor)}>
              {article.relevance_score.toFixed(1)}
            </span>
          </div>

          {/* Expand icon */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 ml-4 border-t border-white/[0.06] pt-3 space-y-3">
              {/* Full summary */}
              <p className="text-sm text-foreground/80 leading-relaxed">
                {article.summary}
              </p>

              {/* Detailed scores */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Domain Score',     value: `${article.score_domain}/40`,      color: 'text-blue-400' },
                  { label: 'Deal Score',        value: `${article.score_deal}/40`,        color: 'text-violet-400' },
                  { label: 'Recency Bonus',     value: `${article.score_recency}/10`,     color: 'text-amber-400' },
                  { label: 'Credibility Score', value: `${article.credibility_score}/10`, color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-2.5 py-1.5
                                              bg-white/[0.03] rounded-lg">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className={cn('text-xs font-bold', color)}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Source + date + link status */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground/70">{article.source}</span>
                <span>{article.published_date}</span>
                {linkValid === true && (
                  <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Link verified
                  </span>
                )}
                {linkValid === false && (
                  <span className="flex items-center gap-0.5 text-rose-400 font-medium">
                    <XCircle className="w-3 h-3" /> {article.link_check_note ?? 'Link invalid'}
                  </span>
                )}
              </div>

              {/* Credibility flag */}
              <p className="text-[10px] text-muted-foreground">
                {article.credibility_flag}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {hasValidUrl && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80
                               transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Read original source
                  </a>
                )}
                <button
                  onClick={toggleSave}
                  className={cn(
                    'ml-auto flex items-center gap-1.5 text-xs transition-colors',
                    saved ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {saved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
