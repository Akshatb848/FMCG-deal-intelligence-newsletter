import type {
  UploadResponse,
  JobStatus,
  ResultsSummaryResponse,
  PipelineConfig,
} from '@/types';
import { MOCK_ARTICLES, MOCK_SUMMARY } from './mockData';

const BASE_URL = '/api';

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function createJob(
  fileId: string,
  config: PipelineConfig,
): Promise<JobStatus> {
  return apiFetch<JobStatus>('/jobs', {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId, config }),
  });
}

export async function getJob(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/jobs/${jobId}`);
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function getResults(
  jobId: string,
): Promise<ResultsSummaryResponse> {
  return apiFetch<ResultsSummaryResponse>(`/results/${jobId}/summary`);
}

export function getDownloadUrl(jobId: string, fmt: 'json' | 'csv' | 'xlsx') {
  return `${BASE_URL}/results/${jobId}/download/${fmt}`;
}

// ── Mock fallback (used when no backend is available) ─────────────────────────

export async function getMockResults(): Promise<ResultsSummaryResponse> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));
  return {
    summary: MOCK_SUMMARY,
    articles: MOCK_ARTICLES,
    progress: [
      { stage: 'ingestion',   input: 38, output: 38, message: 'Loaded 38 records' },
      { stage: 'dedup',       input: 38, output: 30, message: '38 → 30 (8 duplicates removed)' },
      { stage: 'relevance',   input: 30, output: 25, message: '30 → 25 (5 off-topic filtered)' },
      { stage: 'credibility', input: 25, output: 24, message: '25 → 24 (1 hard-blocked)' },
      { stage: 'newsletter',  input: 24, output: 24, message: 'Report generated' },
    ],
  };
}

// ── AI Assistant (mock — replace with real Anthropic API call) ────────────────

export async function sendAIMessage(
  query: string,
  context: { articles: { title: string; deal_type_detected: string; source: string; relevance_score: number }[] },
): Promise<string> {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

  const q = query.toLowerCase();
  const articles = context.articles;
  const total = articles.length;
  const types = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.deal_type_detected] = (acc[a.deal_type_detected] ?? 0) + 1;
    return acc;
  }, {});

  const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
  const topArticle = [...articles].sort((a, b) => b.relevance_score - a.relevance_score)[0];

  if (q.includes('summar') || q.includes('today') || q.includes('latest')) {
    return `**Today's FMCG Deal Intelligence Summary**\n\nI've analyzed **${total} deals** from the pipeline:\n\n` +
      `• **${types['Acquisition'] ?? 0}** Acquisitions led by **${topArticle?.source}**\n` +
      `• **${types['Investment'] ?? 0}** Investment rounds tracked\n` +
      `• **${types['Divestiture'] ?? 0}** Divestitures noted\n\n` +
      `The highest-scored deal is: _${topArticle?.title}_\n\n` +
      `Overall deal activity is trending **upward** with M&A dominating at ${Math.round(((types['Acquisition'] ?? 0) / total) * 100)}% of total volume.`;
  }

  if (q.includes('brand') || q.includes('active') || q.includes('company')) {
    const sources = articles.reduce<Record<string, number>>((acc, a) => {
      acc[a.source] = (acc[a.source] ?? 0) + 1;
      return acc;
    }, {});
    const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    return `**Most Active Brands & Sources**\n\n` +
      `**${topSource?.[0]}** has the highest deal coverage with **${topSource?.[1]} articles**.\n\n` +
      `Top deal types by volume:\n` +
      Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
        `• **${t}**: ${n} deal${n > 1 ? 's' : ''}`
      ).join('\n') +
      `\n\nBig strategics like **Unilever, Nestlé, and PepsiCo** continue to dominate inbound M&A activity.`;
  }

  if (q.includes('invest') || q.includes('funding') || q.includes('series')) {
    const investments = articles.filter(a => a.deal_type_detected === 'Investment');
    return `**Investment & Funding Activity**\n\n` +
      `**${investments.length}** investment-related deals tracked this period.\n\n` +
      `Key themes driving investment:\n` +
      `• **Plant-based & alternative protein** (NotCo, Impossible Foods category)\n` +
      `• **Functional beverages** (energy drinks, nootropics)\n` +
      `• **DTC skincare & beauty** (high-margin direct channels)\n` +
      `• **Emerging market FMCG brands** (India, SE Asia focus)\n\n` +
      `Average deal size: **$280M–$350M** for Series C+ rounds.`;
  }

  if (q.includes('divest') || q.includes('sell') || q.includes('exit')) {
    const divestitures = articles.filter(a => a.deal_type_detected === 'Divestiture');
    return `**Divestiture & Exit Activity**\n\n` +
      `**${divestitures.length}** divestitures recorded.\n\n` +
      `Companies shedding non-core assets:\n` +
      `• **Reckitt** — exiting infant nutrition\n` +
      `• **Kraft Heinz** — divesting legacy coffee brands\n` +
      `• **Danone** — organic dairy portfolio rebalancing\n\n` +
      `This signals a broader **portfolio simplification trend** among large FMCG incumbents, freeing capital for higher-growth digital/health channels.`;
  }

  if (q.includes('trend') || q.includes('sector') || q.includes('market')) {
    return `**FMCG Deal Trends — March 2026**\n\n` +
      `**Key macro trends driving activity:**\n\n` +
      `1. 🌱 **Health & Wellness** — natural, organic, plant-based commanding 3–5x revenue multiples\n` +
      `2. 💄 **Premiumisation in Beauty** — luxury skincare brands (Aesop, Farmacy) fetching $1B+\n` +
      `3. 🥤 **Functional Beverages** — energy, hydration, and nootropic beverages up 40% YoY\n` +
      `4. 🌏 **India & SE Asia** — Haldiram's, Minimalist driving EM FMCG valuations\n` +
      `5. ♻️ **Portfolio Pruning** — legacy brands divested as majors focus on core growth categories\n\n` +
      `Deal multiples: **2.8–4.2x revenue** for high-growth brands; **0.8–1.2x revenue** for mature divested assets.`;
  }

  if (q.includes('high') || q.includes('value') || q.includes('biggest') || q.includes('largest')) {
    const top3 = [...articles].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3);
    return `**Highest-Scoring Deals**\n\n` +
      top3.map((a, i) => `**${i + 1}.** ${a.title}\n   Score: **${a.relevance_score.toFixed(1)}** · Source: ${a.source}`).join('\n\n') +
      `\n\nThese deals score highest on combined domain relevance, deal activity signals, recency, and source credibility.`;
  }

  // Default response
  return `**FMCG Intelligence Assistant**\n\nI can help you analyze the **${total} deals** in the current dataset.\n\n` +
    `Try asking:\n` +
    `• _"Summarize today's top deals"_\n` +
    `• _"What's driving investment activity?"_\n` +
    `• _"Show divestiture trends"_\n` +
    `• _"Which sectors are hottest?"_\n\n` +
    `Current pipeline: **${topType?.[0]}** deals dominate at **${topType?.[1]}** of ${total} total.`;
}
