/**
 * GET /api/news
 * Paginated FMCG intelligence feed from Supabase v_news_feed view.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface NewsFeedItem {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  companies: string[];
  deal_type: string | null;
  geography: string | null;
  deal_value: string | null;
  key_insights: string[];
  confidence_score: number | null;
  trending_flag: boolean;
  trend_score: number;
  source: string | null;
  url: string | null;
  published_at: string | null;
  created_at: string;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
  const limit     = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT))));
  const category  = searchParams.get('category')  ?? null;
  const dealType  = searchParams.get('deal_type') ?? null;
  const geography = searchParams.get('geography') ?? null;
  const trending  = searchParams.get('trending')  === 'true';
  const search    = searchParams.get('search')?.trim() ?? null;
  const sort      = searchParams.get('sort') ?? 'latest';
  const offset    = (page - 1) * limit;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('v_news_feed')
      .select('*', { count: 'exact' });

    if (category)  query = query.eq('category',  category);
    if (dealType)  query = query.eq('deal_type', dealType);
    if (geography) query = query.ilike('geography', `%${geography}%`);
    if (trending)  query = query.eq('trending_flag', true);

    if (search) {
      query = query.textSearch(
        'headline',
        search.split(' ').filter(Boolean).join(' | '),
        { type: 'websearch', config: 'english' },
      );
    }

    switch (sort) {
      case 'trending':
        query = query.order('trending_flag', { ascending: false }).order('trend_score', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'confidence':
        query = query.order('confidence_score', { ascending: false }).order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const articles = (data ?? []) as NewsFeedItem[];
    const total    = count ?? 0;

    return NextResponse.json(
      {
        articles,
        pagination: {
          page, limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next:    offset + limit < total,
          has_prev:    page > 1,
        },
        filters: { category, deal_type: dealType, geography, trending, search, sort },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
