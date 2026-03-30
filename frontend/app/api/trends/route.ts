/**
 * GET /api/trends
 * Trend intelligence: latest snapshot, company activity, trending articles.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { NewsFeedItem } from '../news/route';

interface TrendSnapshot {
  snapshot_date:   string;
  window_hours:    number;
  top_companies:   { name: string; count: number }[];
  top_deal_types:  { type: string; count: number }[];
  top_geographies: { geo: string;  count: number }[];
  trending_topics: { name: string; count: number }[];
  total_articles:  number;
  trend_narrative: string | null;
  created_at:      string;
}

interface CompanyActivity {
  company_name:   string;
  total_mentions: number;
  mentions_7d:    number;
  mentions_24h:   number;
  deal_types:     string[] | null;
  geographies:    string[] | null;
  last_seen_at:   string;
}

interface ProcessedRow {
  deal_type: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const windowHours = parseInt(searchParams.get('window_hours') ?? '24');
  const validWindow = [24, 48, 168].includes(windowHours) ? windowHours : 24;

  try {
    const cutoff = new Date(Date.now() - validWindow * 60 * 60 * 1000).toISOString();

    const [snapshotRes, companiesRes, trendingRes, dealTypeRes] = await Promise.all([
      supabase
        .from('trend_snapshots')
        .select('*')
        .eq('window_hours', validWindow)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('v_company_activity')
        .select('company_name,total_mentions,mentions_7d,mentions_24h,deal_types,geographies,last_seen_at')
        .order('total_mentions', { ascending: false })
        .limit(20),

      supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,geography,deal_value,trending_flag,trend_score,source,published_at')
        .eq('trending_flag', true)
        .order('trend_score', { ascending: false })
        .order('created_at',  { ascending: false })
        .limit(10),

      supabase
        .from('news_processed')
        .select('deal_type')
        .eq('published', true)
        .gte('created_at', cutoff),
    ]);

    const dealTypeRows = (dealTypeRes.data ?? []) as ProcessedRow[];
    const dealTypeBreakdown: Record<string, number> = {};
    for (const row of dealTypeRows) {
      const dt = row.deal_type ?? 'none';
      dealTypeBreakdown[dt] = (dealTypeBreakdown[dt] ?? 0) + 1;
    }
    const dealTypeSorted = Object.entries(dealTypeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const snapshot = snapshotRes.data as TrendSnapshot | null;

    return NextResponse.json(
      {
        snapshot: snapshot ? {
          date:            snapshot.snapshot_date,
          window_hours:    snapshot.window_hours,
          top_companies:   snapshot.top_companies,
          top_deal_types:  snapshot.top_deal_types,
          top_geographies: snapshot.top_geographies,
          trending_topics: snapshot.trending_topics,
          total_articles:  snapshot.total_articles,
          trend_narrative: snapshot.trend_narrative,
          generated_at:    snapshot.created_at,
        } : null,
        companies:           (companiesRes.data ?? []) as CompanyActivity[],
        trending_articles:   (trendingRes.data   ?? []) as NewsFeedItem[],
        deal_type_breakdown: dealTypeSorted,
        window_hours:        validWindow,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
