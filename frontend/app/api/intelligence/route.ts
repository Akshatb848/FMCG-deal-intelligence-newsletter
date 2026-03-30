/**
 * GET /api/intelligence
 *
 * Company Intelligence Layer — tracks companies across articles,
 * returns a simple knowledge graph.
 *
 * Query params:
 *   company     string  filter by company name (partial match)
 *   limit       number  (default 20, max 50)
 *   sort        string  mentions | recent | deals
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const company = searchParams.get('company')?.trim() ?? null;
  const limit   = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const sort    = searchParams.get('sort') ?? 'mentions';

  try {
    // ── Company activity from the materialized view ───────────────────────
    let activityQuery = supabase
      .from('v_company_activity')
      .select('*');

    if (company) {
      activityQuery = activityQuery.ilike('company_name', `%${company}%`);
    }

    switch (sort) {
      case 'recent':
        activityQuery = activityQuery.order('last_seen_at', { ascending: false });
        break;
      case 'deals':
        activityQuery = activityQuery
          .not('deal_types', 'is', null)
          .order('total_mentions', { ascending: false });
        break;
      case 'mentions':
      default:
        activityQuery = activityQuery.order('total_mentions', { ascending: false });
    }

    activityQuery = activityQuery.limit(limit);

    const { data: companies, error: compErr } = await activityQuery;
    if (compErr) throw compErr;

    // ── For a specific company, fetch recent articles ─────────────────────
    let companyArticles: unknown[] = [];
    if (company && companies?.length) {
      const exactName = companies[0]?.company_name;
      if (exactName) {
        const { data: articles } = await supabase
          .from('v_news_feed')
          .select('id,title,category,deal_type,geography,deal_value,source,published_at,trending_flag')
          .contains('companies', [exactName])
          .order('created_at', { ascending: false })
          .limit(10);

        companyArticles = articles ?? [];
      }
    }

    // ── Top 5 companies for the knowledge graph summary ───────────────────
    const { data: top5 } = await supabase
      .from('v_company_activity')
      .select('company_name,total_mentions,mentions_24h,deal_types')
      .order('total_mentions', { ascending: false })
      .limit(5);

    // ── Recent deal connections (pairs of companies in the same article) ──
    const { data: recentPairs } = await supabase
      .from('news_processed')
      .select('companies,deal_type,headline')
      .eq('published', true)
      .neq('deal_type', 'none')
      .order('created_at', { ascending: false })
      .limit(20);

    // Build a simple adjacency list: company → co-mentioned companies
    const edges: Record<string, Set<string>> = {};
    for (const article of (recentPairs ?? [])) {
      const cos: string[] = Array.isArray(article.companies) ? article.companies : JSON.parse(article.companies || '[]');
      for (let i = 0; i < cos.length; i++) {
        for (let j = i + 1; j < cos.length; j++) {
          if (!edges[cos[i]]) edges[cos[i]] = new Set();
          if (!edges[cos[j]]) edges[cos[j]] = new Set();
          edges[cos[i]].add(cos[j]);
          edges[cos[j]].add(cos[i]);
        }
      }
    }

    const graph = Object.entries(edges).map(([company, connected]) => ({
      company,
      connected_to: Array.from(connected).slice(0, 10),
      degree: connected.size,
    })).sort((a, b) => b.degree - a.degree).slice(0, 30);

    return NextResponse.json(
      {
        companies:          companies ?? [],
        company_articles:   companyArticles,
        top_5:              top5 ?? [],
        knowledge_graph:    graph,
        filter:             { company, sort, limit },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/intelligence] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
