'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMockResults, getResults } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { Article, KPIData, TrendPoint } from '@/types';
import { MOCK_TREND_DATA } from '@/lib/mockData';

// ── Primary data hook ─────────────────────────────────────────────────────────

export function useDealsData() {
  const jobId = useStore((s) => s.currentJobId);

  return useQuery({
    queryKey: ['deals', jobId],
    queryFn: async () => {
      if (jobId) {
        try {
          return await getResults(jobId);
        } catch {
          // Fall back to mock if API unavailable
        }
      }
      return getMockResults();
    },
    staleTime: 5 * 60 * 1000,  // 5 min
    gcTime:   15 * 60 * 1000,  // 15 min
  });
}

// ── Filtered articles ─────────────────────────────────────────────────────────

export function useFilteredArticles(articles: Article[] = []) {
  const filters = useStore((s) => s.filters);

  return useMemo(() => {
    let list = [...articles];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q),
      );
    }
    if (filters.dealType && filters.dealType !== 'all') {
      list = list.filter((a) => a.deal_type_detected === filters.dealType);
    }
    if (filters.source && filters.source !== 'all') {
      list = list.filter((a) => a.source === filters.source);
    }
    if (filters.minScore > 0) {
      list = list.filter((a) => a.relevance_score >= filters.minScore);
    }
    if (filters.dateRange !== 'all') {
      const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter((a) => new Date(a.published_date) >= cutoff);
    }

    return list;
  }, [articles, filters]);
}

// ── KPI computation ───────────────────────────────────────────────────────────

export function useKPIs(articles: Article[]): KPIData {
  return useMemo(() => {
    if (!articles.length) {
      return {
        totalDeals: 0,
        topBrand: '—',
        avgScore: 0,
        avgCredibility: 0,
        typeBreakdown: {},
        survivalRate: 0,
      };
    }

    const avgScore = articles.reduce((s, a) => s + a.relevance_score, 0) / articles.length;
    const avgCred  = articles.reduce((s, a) => s + a.credibility_score, 0) / articles.length;

    const typeBreakdown = articles.reduce<Record<string, number>>((acc, a) => {
      acc[a.deal_type_detected] = (acc[a.deal_type_detected] ?? 0) + 1;
      return acc;
    }, {});

    // Most-mentioned brand (naive: check which companies appear most in titles)
    const BRANDS = ['Unilever', 'Nestlé', 'PepsiCo', 'Coca-Cola', "L'Oréal", 'Kraft Heinz',
                    'Mondelez', 'Reckitt', 'Diageo', 'AB InBev', 'Danone', 'KKR'];
    const brandCounts = BRANDS.map((b) => ({
      brand: b,
      count: articles.filter((a) => a.title.includes(b) || a.summary.includes(b)).length,
    }));
    const topBrand = brandCounts.sort((a, b) => b.count - a.count)[0]?.brand ?? articles[0]?.source ?? '—';

    return {
      totalDeals:     articles.length,
      topBrand,
      avgScore:       Math.round(avgScore * 10) / 10,
      avgCredibility: Math.round(avgCred * 10) / 10,
      typeBreakdown,
      survivalRate:   100,  // populated from summary when available
    };
  }, [articles]);
}

// ── Trend data ────────────────────────────────────────────────────────────────

export function useTrendData(): TrendPoint[] {
  return MOCK_TREND_DATA;
}

// ── Unique sources list ───────────────────────────────────────────────────────

export function useSources(articles: Article[]): string[] {
  return useMemo(
    () => [...new Set(articles.map((a) => a.source))].sort(),
    [articles],
  );
}
