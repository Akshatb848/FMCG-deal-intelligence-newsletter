/**
 * GET  /api/newsletter/generate  — fetch latest newsletter
 * POST /api/newsletter/generate  — generate on-demand via Claude
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase, createServiceClient } from '@/lib/supabase';
import type { NewsFeedItem } from '../../news/route';

const MODEL  = 'claude-sonnet-4-6';

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: 'No newsletter found. POST to generate one.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ newsletter: data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch newsletter' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxArticles     = Math.min(25, Math.max(5, (body.max_articles as number | undefined) ?? 15));
  const forceRegenerate = body.force_regenerate === true;
  const today           = new Date().toISOString().split('T')[0];

  // Skip if today's edition already exists (unless forced)
  if (!forceRegenerate) {
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id,title,published_at')
      .gte('published_at', `${today}T00:00:00Z`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ newsletter: existing, cached: true });
    }
  }

  // Fetch top articles
  const { data: articlesRaw, error: artError } = await supabase
    .from('v_news_feed')
    .select('*')
    .order('trending_flag',    { ascending: false })
    .order('trend_score',      { ascending: false })
    .order('confidence_score', { ascending: false })
    .limit(maxArticles);

  if (artError || !articlesRaw?.length) {
    return NextResponse.json(
      { error: 'No articles available for newsletter generation.' },
      { status: 422 },
    );
  }

  const articles = articlesRaw as NewsFeedItem[];

  const stats = {
    total_articles: articles.length,
    deals:     articles.filter(a => a.category === 'Deals').length,
    trends:    articles.filter(a => a.category === 'Trends').length,
    trending:  articles.filter(a => a.trending_flag).length,
  };

  const trendingNames = Array.from(
    new Set(articles.filter(a => a.trending_flag).flatMap(a => a.companies as string[]))
  ).slice(0, 5).join(', ');

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const articlesForPrompt = articles.map(a => ({
    headline:     a.title,
    summary:      a.summary,
    category:     a.category,
    deal_type:    a.deal_type,
    companies:    a.companies,
    deal_value:   a.deal_value,
    geography:    a.geography,
    key_insights: a.key_insights,
    source:       a.source,
    trending:     a.trending_flag,
  }));

  const prompt = `You are the editor of the FMCG Deal Intelligence Daily Brief — a premium newsletter read by M&A analysts, brand strategists, and PE investors.

Write today's edition (${dateStr}) using ONLY the articles provided. Be specific, analytical, and concise.

ARTICLES (${articles.length} total):
${JSON.stringify(articlesForPrompt, null, 2)}

STATS: Deals=${stats.deals}, Trends=${stats.trends}, Trending=${stats.trending}, Trending companies: ${trendingNames || 'none'}

FORMAT (Markdown):

## FMCG Deal Intelligence — ${dateStr}

**EXECUTIVE SUMMARY**
[2 sentences: most significant development + strategic significance]

---

### 🔑 TOP DEAL HIGHLIGHTS

**1. [Headline]**
[2-sentence factual summary]
*Why it matters:* [1 sentence]

**2. [Headline]**
[2-sentence factual summary]
*Why it matters:* [1 sentence]

**3. [Headline]**
[2-sentence factual summary]
*Why it matters:* [1 sentence]

---

### 📈 TREND WATCH
[1 paragraph — patterns, numbers, company names]

---

### 🏢 COMPANY MOVES
• [Company]: [what happened] ([deal type, geography])

---

### 📊 TODAY'S NUMBERS
• Total deals tracked: ${stats.total_articles}
• Acquisitions: ${articlesForPrompt.filter(a => a.deal_type === 'acquisition').length}
• Investments: ${articlesForPrompt.filter(a => a.deal_type === 'investment').length}
• Divestitures: ${articlesForPrompt.filter(a => a.deal_type === 'divestiture').length}
• Trending: ${stats.trending} stories`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    const contentText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    if (!contentText) {
      return NextResponse.json({ error: 'Claude returned empty response' }, { status: 502 });
    }

    const highlights = articles.slice(0, 3).map(a => ({
      headline:  a.title,
      summary:   a.summary,
      companies: a.companies,
      deal_type: a.deal_type,
      url:       a.url,
    }));

    const serviceClient = createServiceClient();
    const { data: saved, error: saveErr } = await serviceClient
      .from('newsletters')
      .insert({
        title:        `FMCG Deal Intelligence — ${dateStr}`,
        date_range:   dateStr,
        edition:      'Daily',
        content_text: contentText,
        article_ids:  articles.map(a => a.id),
        highlights,
        stats,
      })
      .select()
      .maybeSingle();

    if (saveErr) {
      console.error('[newsletter/generate] Save error:', saveErr.message);
      return NextResponse.json({
        newsletter: { content_text: contentText, title: `FMCG Deal Intelligence — ${dateStr}`, stats },
        article_count: articles.length,
        saved: false,
      });
    }

    return NextResponse.json(
      { newsletter: saved, article_count: articles.length, saved: true },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    console.error('[newsletter/generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
