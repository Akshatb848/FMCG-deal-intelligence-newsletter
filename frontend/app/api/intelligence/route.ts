/**
 * GET /api/intelligence
 * Company knowledge graph + activity data from Supabase.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  companies: string[] | string | null;
  deal_type: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const company = searchParams.get('company')?.trim() ?? null;
  const limit   = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const sort    = searchParams.get('sort') ?? 'mentions';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activityQuery: any = supabase.from('v_company_activity').select('*');

    if (company) activityQuery = activityQuery.ilike('company_name', `%${company}%`);

    switch (sort) {
      case 'recent':
        activityQuery = activityQuery.order('last_seen_at', { ascending: false });
        break;
      case 'deals':
        activityQuery = activityQuery.not('deal_types', 'is', null).order('total_mentions', { ascending: false });
        break;
      default:
        activityQuery = activityQuery.order('total_mentions', { ascending: false });
    }

    activityQuery = activityQuery.limit(limit);

    const { data: companiesRaw, error: compErr } = await activityQuery;
    if (compErr) throw compErr;

    const companies = (companiesRaw ?? []) as CompanyActivity[];

    // Fetch articles for the searched company
    let companyArticles: unknown[] = [];
    if (company && companies.length > 0) {
      const exactName = companies[0]?.company_name;
      if (exactName) {
        const { data: artData } = await supabase
          .from('v_news_feed')
          .select('id,title,category,deal_type,geography,deal_value,source,published_at,trending_flag')
          .contains('companies', [exactName])
          .order('created_at', { ascending: false })
          .limit(10);
        companyArticles = artData ?? [];
      }
    }

    // Top 5 summary
    const { data: top5Raw } = await supabase
      .from('v_company_activity')
      .select('company_name,total_mentions,mentions_24h,deal_types')
      .order('total_mentions', { ascending: false })
      .limit(5);

    // Knowledge graph edges (co-mentioned companies)
    const { data: pairsRaw } = await supabase
      .from('news_processed')
      .select('companies,deal_type')
      .eq('published', true)
      .neq('deal_type', 'none')
      .order('created_at', { ascending: false })
      .limit(30);

    const pairs = (pairsRaw ?? []) as ProcessedRow[];
    const edges: Record<string, Set<string>> = {};

    for (const art of pairs) {
      let cos: string[] = [];
      if (Array.isArray(art.companies)) {
        cos = art.companies as string[];
      } else if (typeof art.companies === 'string') {
        try { cos = JSON.parse(art.companies); } catch { cos = []; }
      }

      for (let i = 0; i < cos.length; i++) {
        for (let j = i + 1; j < cos.length; j++) {
          edges[cos[i]] ??= new Set();
          edges[cos[j]] ??= new Set();
          edges[cos[i]].add(cos[j]);
          edges[cos[j]].add(cos[i]);
        }
      }
    }

    const graph = Object.entries(edges)
      .map(([co, connected]) => ({ company: co, connected_to: Array.from(connected).slice(0, 10), degree: connected.size }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 30);

    return NextResponse.json(
      {
        companies,
        company_articles: companyArticles,
        top_5:            top5Raw ?? [],
        knowledge_graph:  graph,
        filter:           { company, sort, limit },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
