/**
 * GET /api/trends
 *
 * Returns trend intelligence:
 *  - Latest trend snapshot (hourly)
 *  - Top companies by activity
 *  - Deal type breakdown
 *  - Geographic distribution
 *  - Trending articles
 *
 * Query params:
 *   window_hours  number  (default 24) — 24 | 48 | 168 (7d)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const windowHours = parseInt(searchParams.get('window_hours') ?? '24');
  const validWindow = [24, 48, 168].includes(windowHours) ? windowHours : 24;

  try {
    // Run queries in parallel for performance
    const [snapshotResult, companiesResult, trendingResult, dealTypeResult] = await Promise.all([

      // Latest trend snapshot
      supabase
        .from('trend_snapshots')
        .select('*')
        .eq('window_hours', validWindow)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Company activity view
      supabase
        .from('v_company_activity')
        .select('company_name,total_mentions,mentions_7d,mentions_24h,deal_types,geographies,last_seen_at')
        .order('total_mentions', { ascending: false })
        .limit(20),

      // Trending articles
      supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,geography,deal_value,trending_flag,trend_score,source,published_at')
        .eq('trending_flag', true)
        .order('trend_score', { ascending: false })
        .order('created_at',  { ascending: false })
        .limit(10),

      // Deal type breakdown for the window
      supabase
        .from('news_processed')
        .select('deal_type')
        .eq('published', true)
        .gte('created_at', new Date(Date.now() - validWindow * 60 * 60 * 1000).toISOString()),
    ]);

    // Compute deal type breakdown from raw rows
    const dealTypeRows = dealTypeResult.data ?? [];
    const dealTypeBreakdown: Record<string, number> = {};
    for (const row of dealTypeRows) {
      const dt = row.deal_type ?? 'none';
      dealTypeBreakdown[dt] = (dealTypeBreakdown[dt] ?? 0) + 1;
    }
    const dealTypeSorted = Object.entries(dealTypeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const snapshot = snapshotResult.data;

    return NextResponse.json(
      {
        snapshot: snapshot
          ? {
              date:              snapshot.snapshot_date,
              window_hours:      snapshot.window_hours,
              top_companies:     snapshot.top_companies,
              top_deal_types:    snapshot.top_deal_types,
              top_geographies:   snapshot.top_geographies,
              trending_topics:   snapshot.trending_topics,
              total_articles:    snapshot.total_articles,
              trend_narrative:   snapshot.trend_narrative,
              generated_at:      snapshot.created_at,
            }
          : null,
        companies:         companiesResult.data ?? [],
        trending_articles: trendingResult.data   ?? [],
        deal_type_breakdown: dealTypeSorted,
        window_hours: validWindow,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/trends] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
