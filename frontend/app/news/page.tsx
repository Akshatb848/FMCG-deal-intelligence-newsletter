'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Newspaper, RefreshCw } from 'lucide-react';
import { useDealsData, useFilteredArticles, useSources } from '@/hooks/useDeals';
import { DealCard } from '@/components/news/DealCard';
import { NewsFilters } from '@/components/news/NewsFilters';
import { CardSkeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 8;

export default function NewsPage() {
  const { data, isLoading, refetch, isFetching } = useDealsData();
  const all      = data?.articles ?? [];
  const filtered = useFilteredArticles(all);
  const sources  = useSources(all);

  // Simple client-side pagination via intersection observer
  const { ref: bottomRef, inView } = useInView({ threshold: 0 });
  const pageRef = useRef(1);
  if (inView && pageRef.current * PAGE_SIZE < filtered.length) {
    pageRef.current += 1;
  }
  const visible = filtered.slice(0, pageRef.current * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 bg-white/[0.06] rounded-lg animate-pulse w-48 mb-6" />
        <div className="h-32 glass rounded-xl border border-white/[0.08] animate-pulse" />
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20
                          flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Deal News Feed</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {all.length} deals shown
            </p>
          </div>
        </div>
        <button
          onClick={() => { pageRef.current = 1; refetch(); }}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     bg-white/[0.04] border border-white/[0.08] text-muted-foreground
                     hover:bg-white/[0.08] transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <NewsFilters sources={sources} />
      </motion.div>

      {/* Cards */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No deals match your current filters.</p>
          </div>
        ) : (
          visible.map((article, i) => (
            <DealCard key={article.id} article={article} index={i} />
          ))
        )}

        {/* Infinite scroll trigger */}
        {visible.length < filtered.length && (
          <div ref={bottomRef} className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-white/10 border-t-primary
                            rounded-full animate-spin" />
          </div>
        )}

        {visible.length > 0 && visible.length >= filtered.length && (
          <p className="text-center text-xs text-muted-foreground py-4">
            All {filtered.length} deals loaded
          </p>
        )}
      </div>
    </div>
  );
}
