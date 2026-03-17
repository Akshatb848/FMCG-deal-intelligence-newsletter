'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Grid3X3, List, Trash2, BookmarkX, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DealCard } from '@/components/news/DealCard';
import { cn, DEAL_TYPE_CONFIG, timeAgo, truncate } from '@/lib/utils';
import type { Article } from '@/types';

type ViewMode = 'list' | 'grid';

function GridCard({ article }: { article: Article }) {
  const { unsaveArticle } = useStore();
  const cfg = DEAL_TYPE_CONFIG[article.deal_type_detected] ?? DEAL_TYPE_CONFIG['Other'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className="glass rounded-xl border border-white/[0.08] p-4 flex flex-col gap-3
                 hover:border-white/[0.14] transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border',
          cfg.bg, cfg.color, cfg.border,
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {article.deal_type_detected}
        </span>
        <button
          onClick={() => unsaveArticle(article.id)}
          className="text-muted-foreground/40 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-3 flex-1">
        {article.title}
      </h3>

      {/* Summary */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {truncate(article.summary, 120)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
        <span className="text-[10px] text-muted-foreground">{article.source}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{timeAgo(article.published_date)}</span>
          <span className="text-xs font-bold text-foreground">{article.relevance_score.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function SavedPage() {
  const { savedArticles, clearSaved } = useStore();
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');

  const filtered = savedArticles.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'saved-deals.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20
                          flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Saved Deals</h1>
            <p className="text-xs text-muted-foreground">
              {savedArticles.length} bookmarked article{savedArticles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {savedArticles.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                         bg-white/[0.04] border border-white/[0.08] text-muted-foreground
                         hover:bg-white/[0.08] transition-all"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <button
              onClick={clearSaved}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                         bg-rose-500/10 border border-rose-500/20 text-rose-400
                         hover:bg-rose-500/20 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </button>
          </div>
        )}
      </motion.div>

      {savedArticles.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20
                          flex items-center justify-center mx-auto mb-4">
            <BookmarkX className="w-8 h-8 text-amber-400/50" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No saved deals yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Browse the news feed and bookmark deals that matter to you. They'll appear here.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-lg
                            border border-white/[0.06] px-3 py-2
                            focus-within:border-primary/30 transition-colors">
              <input
                type="text"
                placeholder="Search saved deals…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground
                           placeholder:text-muted-foreground outline-none"
              />
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
              {([['list', List], ['grid', Grid3X3]] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-2 transition-colors',
                    view === v
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {search && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
            </p>
          )}

          {/* Articles */}
          <AnimatePresence mode="popLayout">
            {view === 'list' ? (
              <div key="list" className="space-y-3">
                {filtered.map((a, i) => (
                  <DealCard key={a.id} article={a} index={i} />
                ))}
              </div>
            ) : (
              <motion.div
                key="grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filtered.map((a) => (
                  <GridCard key={a.id} article={a} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
