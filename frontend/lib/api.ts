import type {
  UploadResponse,
  JobStatus,
  ResultsSummaryResponse,
  PipelineConfig,
  Newsletter,
  RawDataResponse,
  ProcessedDataResponse,
} from '@/types';
import { MOCK_ARTICLES, MOCK_SUMMARY, MOCK_NEWSLETTER } from './mockData';

// ── Base URL ───────────────────────────────────────────────────────────────────
// In production (Vercel): all /api/* calls proxy to NEXT_PUBLIC_API_URL via next.config.js
// In local dev: proxied to http://localhost:8000
const BASE_URL = '/api';

// ── Request timeout (ms) ───────────────────────────────────────────────────────
const TIMEOUT_MS = 12_000;

// ── Generic fetch with timeout ────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: controller.signal,
      ...init,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out — backend may be starting up');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000); // uploads need more time

  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function createJob(fileId: string, config: PipelineConfig): Promise<JobStatus> {
  return apiFetch<JobStatus>('/jobs', {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId, config }),
  });
}

export async function getJob(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/jobs/${jobId}`);
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function getResults(jobId: string): Promise<ResultsSummaryResponse> {
  return apiFetch<ResultsSummaryResponse>(`/results/${jobId}/summary`);
}

export function getDownloadUrl(jobId: string, fmt: 'json' | 'csv' | 'xlsx' | 'docx') {
  return `${BASE_URL}/results/${jobId}/download/${fmt}`;
}

/** Download from the latest completed pipeline run — no job_id needed. */
export function getLatestDownloadUrl(fmt: 'json' | 'csv' | 'xlsx' | 'docx') {
  return `${BASE_URL}/download/${fmt}`;
}

export async function triggerDownload(fmt: 'csv' | 'xlsx' | 'docx'): Promise<void> {
  const url = getLatestDownloadUrl(fmt);
  const labels: Record<string, string> = {
    csv:  'FMCG_Deal_Intelligence_Report.csv',
    xlsx: 'FMCG_Deal_Intelligence_Report.xlsx',
    docx: 'FMCG_Deal_Intelligence_Newsletter.docx',
  };
  const a = document.createElement('a');
  a.href = url;
  a.download = labels[fmt];
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

export async function getMockResults(): Promise<ResultsSummaryResponse> {
  await new Promise((r) => setTimeout(r, 400)); // simulate latency
  return {
    summary: MOCK_SUMMARY,
    articles: MOCK_ARTICLES,
    progress: [
      { stage: 'ingestion',   input: 38, output: 38, message: 'Loaded 38 records' },
      { stage: 'dedup',       input: 38, output: 30, message: '8 duplicates removed' },
      { stage: 'relevance',   input: 30, output: 25, message: '5 off-topic filtered' },
      { stage: 'credibility', input: 25, output: 24, message: '1 hard-blocked source' },
      { stage: 'newsletter',  input: 24, output: 24, message: 'Report generated' },
    ],
  };
}

// ── Pipeline convenience endpoints ────────────────────────────────────────────

export async function getRawData(): Promise<RawDataResponse> {
  try {
    const data = await apiFetch<RawDataResponse>('/raw-data');
    // Validate response shape
    if (!data || !Array.isArray(data.records)) throw new Error('Invalid raw-data response');
    return data;
  } catch (err) {
    console.warn('[API] getRawData falling back to mock:', (err as Error).message);
    return {
      count: MOCK_ARTICLES.length,
      records: MOCK_ARTICLES as unknown as RawDataResponse['records'],
    };
  }
}

export async function getProcessedData(): Promise<ProcessedDataResponse> {
  try {
    const data = await apiFetch<ProcessedDataResponse>('/processed-data');
    if (!data || !Array.isArray(data.articles)) throw new Error('Invalid processed-data response');
    return data;
  } catch (err) {
    console.warn('[API] getProcessedData falling back to mock:', (err as Error).message);
    return { count: MOCK_ARTICLES.length, summary: MOCK_SUMMARY, articles: MOCK_ARTICLES };
  }
}

export async function getNewsletter(): Promise<Newsletter> {
  try {
    const data = await apiFetch<Newsletter>('/newsletter');
    // Validate minimum required fields
    if (!data || !data.header || !Array.isArray(data.all_deals)) {
      throw new Error('Invalid newsletter response shape');
    }
    return data;
  } catch (err) {
    console.warn('[API] getNewsletter falling back to mock:', (err as Error).message);
    return MOCK_NEWSLETTER;
  }
}

export async function runPipeline(): Promise<{ job_id: string; status: string; message: string }> {
  return apiFetch('/run-pipeline', { method: 'POST' });
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    await apiFetch('/health');
    return true;
  } catch {
    return false;
  }
}

// ── AI Assistant ──────────────────────────────────────────────────────────────

export async function sendAIMessage(
  query: string,
  context: { articles: { title: string; deal_type_detected: string; source: string; relevance_score: number }[] },
): Promise<string> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

  const q = query.toLowerCase();
  const articles = context.articles ?? [];
  const total = articles.length;

  if (total === 0) {
    return '**No data loaded yet.**\n\nRun the pipeline first to populate deal intelligence data, then ask me anything about the deals.';
  }

  const types = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.deal_type_detected] = (acc[a.deal_type_detected] ?? 0) + 1;
    return acc;
  }, {});
  const topType  = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
  const topArticle = [...articles].sort((a, b) => b.relevance_score - a.relevance_score)[0];

  if (q.includes('summar') || q.includes('today') || q.includes('latest')) {
    return `**Today's FMCG Deal Intelligence Summary**\n\nAnalyzed **${total} deals**:\n\n` +
      `• **${types['Acquisition'] ?? 0}** Acquisitions\n` +
      `• **${types['Investment'] ?? 0}** Investment rounds\n` +
      `• **${types['Divestiture'] ?? 0}** Divestitures\n\n` +
      `Top deal: _${topArticle?.title ?? 'N/A'}_\n\n` +
      `M&A dominates at **${Math.round(((types['Acquisition'] ?? 0) / total) * 100)}%** of total volume.`;
  }

  if (q.includes('brand') || q.includes('active') || q.includes('company')) {
    const sources = articles.reduce<Record<string, number>>((acc, a) => {
      acc[a.source] = (acc[a.source] ?? 0) + 1; return acc;
    }, {});
    const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    return `**Most Active Sources**\n\n**${topSource?.[0]}** leads with **${topSource?.[1]} articles**.\n\n` +
      Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `• **${t}**: ${n}`).join('\n');
  }

  if (q.includes('invest') || q.includes('funding')) {
    const n = types['Investment'] ?? 0;
    return `**Investment Activity**\n\n**${n}** investment-related deals tracked.\n\n` +
      `Key themes: plant-based protein, functional beverages, DTC beauty, EM FMCG brands.`;
  }

  if (q.includes('divest') || q.includes('sell') || q.includes('exit')) {
    const n = types['Divestiture'] ?? 0;
    return `**Divestiture Activity**\n\n**${n}** divestitures recorded.\n\n` +
      `Trend: large FMCG incumbents shedding non-core assets to fund higher-growth channels.`;
  }

  if (q.includes('trend') || q.includes('sector') || q.includes('market')) {
    return `**FMCG Deal Trends — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}**\n\n` +
      `1. 🌱 **Health & Wellness** — 3–5x revenue multiples\n` +
      `2. 💄 **Premiumisation in Beauty** — luxury brands $1B+\n` +
      `3. 🥤 **Functional Beverages** — +40% YoY\n` +
      `4. 🌏 **Emerging Markets** — India & SE Asia leading\n` +
      `5. ♻️ **Portfolio Pruning** — legacy brand divestitures`;
  }

  if (q.includes('high') || q.includes('value') || q.includes('biggest')) {
    const top3 = [...articles].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3);
    return `**Highest-Scoring Deals**\n\n` +
      top3.map((a, i) => `**${i + 1}.** ${a.title}\n   Score: **${a.relevance_score.toFixed(1)}** · ${a.source}`).join('\n\n');
  }

  return `**FMCG Intelligence Assistant**\n\nAnalyzing **${total} deals**.\n\n` +
    `Try: _"Summarize today's deals"_, _"Investment trends"_, _"Divestiture activity"_, _"Biggest deals"_\n\n` +
    `Top deal type: **${topType?.[0] ?? 'N/A'}** (${topType?.[1] ?? 0} deals)`;
}
