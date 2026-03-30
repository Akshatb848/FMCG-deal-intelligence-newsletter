/**
 * GET /api/news/[id]
 * Single article + related articles from Supabase.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { NewsFeedItem } from '../route';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
  }

  try {
    const { data: articleData, error } = await supabase
      .from('v_news_feed')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !articleData) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articleData as NewsFeedItem;
    const companies: string[] = Array.isArray(article.companies) ? article.companies : [];
    let related: NewsFeedItem[] = [];

    if (companies.length > 0) {
      const { data: relData } = await supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,source,published_at,trending_flag')
        .contains('companies', companies.slice(0, 2))
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      related = (relData ?? []) as NewsFeedItem[];
    }

    if (related.length < 3 && article.deal_type && article.deal_type !== 'none') {
      const { data: moreData } = await supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,source,published_at,trending_flag')
        .eq('deal_type', article.deal_type)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5 - related.length);

      const existing = new Set(related.map(r => r.id));
      const extra = ((moreData ?? []) as NewsFeedItem[]).filter(r => !existing.has(r.id));
      related = [...related, ...extra];
    }

    return NextResponse.json(
      { article, related },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
