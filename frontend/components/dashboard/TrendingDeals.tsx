'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn, DEAL_TYPE_CONFIG, timeAgo, truncate, SOURCE_TIER_COLOR } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import type { Article } from '@/types';

interface TrendingDealsProps {
  articles: Article[];
  limit?: number;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

export function TrendingDeals({ articles, limit = 6 }: TrendingDealsProps) {
  const { saveArticle, unsaveArticle, isSaved } = useStore();
  const top = articles.slice(0, limit);

  const toggleSave = (article: Article, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved(article.id)) {
      unsaveArticle(article.id);
      toast.success('Removed from saved');
    } else {
      saveArticle(article);
      toast.success('Saved to bookmarks');
    }
  };

  return (
    <div className="glass rounded-xl border border-white/[0.08]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top Deals by Score</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ranked by pipeline relevance score</p>
        </div>
        <Link
          href="/news"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80
                     transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="divide-y divide-white/[0.04]"
      >
        {top.map((article, i) => {
          const cfg     = DEAL_TYPE_CONFIG[article.deal_type_detected] ?? DEAL_TYPE_CONFIG['Other'];
          const tierClr = SOURCE_TIER_COLOR[article.source_tier ?? 0];
          const saved   = isSaved(article.id);

          return (
            <motion.div
              key={article.id}
              variants={item}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
              className="group px-4 py-3 flex items-start gap-3 cursor-pointer
                         transition-colors duration-150"
            >
              {/* Rank */}
              <span className="text-sm font-bold text-muted-foreground/50 w-4 flex-shrink-0 pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-snug
                                group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </p>
                  <button
                    onClick={(e) => toggleSave(article, e)}
                    className={cn(
                      'flex-shrink-0 mt-0.5 transition-colors',
                      saved ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground',
                    )}
                  >
                    {saved
                      ? <BookmarkCheck className="w-3.5 h-3.5" />
                      : <Bookmark      className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {truncate(article.summary, 100)}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Deal type badge */}
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                    cfg.bg, cfg.color, cfg.border, 'border',
                  )}>
                    <span className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                    {article.deal_type_detected}
                  </span>

                  {/* Source */}
                  <span className={cn('text-[10px] font-medium', tierClr)}>
                    {article.source}
                  </span>

                  {/* Date */}
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(article.published_date)}
                  </span>

                  {/* Score */}
                  <span className="ml-auto text-[10px] font-bold text-foreground">
                    {article.relevance_score.toFixed(1)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
