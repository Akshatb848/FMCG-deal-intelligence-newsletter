/**
 * GET /api/news/[id]
 *
 * Returns a single processed article with full detail including
 * related articles from the same cluster.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
  }

  try {
    // Fetch the article from the view
    const { data: article, error } = await supabase
      .from('v_news_feed')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Fetch related articles — same companies or same deal_type, recent
    const companiesArr: string[] = Array.isArray(article.companies) ? article.companies : [];
    let related: unknown[] = [];

    if (companiesArr.length > 0) {
      const { data: relatedData } = await supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,source,published_at,trending_flag')
        .contains('companies', companiesArr.slice(0, 2))   // any matching company
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      related = relatedData ?? [];
    }

    // If not enough related, fill with same deal_type
    if (related.length < 3 && article.deal_type && article.deal_type !== 'none') {
      const { data: moreRelated } = await supabase
        .from('v_news_feed')
        .select('id,title,category,deal_type,companies,source,published_at,trending_flag')
        .eq('deal_type', article.deal_type)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5 - related.length);

      const existingIds = new Set((related as { id: string }[]).map(r => r.id));
      const extra = (moreRelated ?? []).filter((r: { id: string }) => !existingIds.has(r.id));
      related = [...related, ...extra];
    }

    return NextResponse.json(
      { article, related },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error(`[/api/news/${id}] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
