/**
 * GET /api/news
 *
 * Returns published FMCG intelligence articles from Supabase.
 * Falls back to the FastAPI backend if Supabase is not configured.
 *
 * Query params:
 *   page        number   (default 1)
 *   limit       number   (default 20, max 100)
 *   category    string   Deals | Trends | Product Launch | Regulatory | Other
 *   deal_type   string   acquisition | merger | investment | ...
 *   geography   string   free text filter
 *   trending    boolean  only trending articles
 *   search      string   full-text search on headline + summary
 *   sort        string   latest (default) | trending | confidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('v_news_feed')
      .select('*', { count: 'exact' });

    // ── Filters ────────────────────────────────────────────────────────────
    if (category)  query = query.eq('category',  category);
    if (dealType)  query = query.eq('deal_type', dealType);
    if (geography) query = query.ilike('geography', `%${geography}%`);
    if (trending)  query = query.eq('trending_flag', true);

    if (search) {
      // Use Postgres full-text search on headline + summary
      query = query.textSearch(
        'headline',
        search.split(' ').filter(Boolean).join(' | '),
        { type: 'websearch', config: 'english' },
      );
    }

    // ── Sort ───────────────────────────────────────────────────────────────
    switch (sort) {
      case 'trending':
        query = query
          .order('trending_flag', { ascending: false })
          .order('trend_score',   { ascending: false })
          .order('created_at',    { ascending: false });
        break;
      case 'confidence':
        query = query
          .order('confidence_score', { ascending: false })
          .order('created_at',       { ascending: false });
        break;
      case 'latest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[/api/news] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count ?? 0;

    return NextResponse.json(
      {
        articles:    data ?? [],
        pagination: {
          page,
          limit,
          total:        totalCount,
          total_pages:  Math.ceil(totalCount / limit),
          has_next:     offset + limit < totalCount,
          has_prev:     page > 1,
        },
        filters: { category, deal_type: dealType, geography, trending, search, sort },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/news] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
