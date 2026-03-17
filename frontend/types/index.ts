// ── Core article / deal type ──────────────────────────────────────────────────
export interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  published_date: string;
  url: string;
  category: string;
  full_text: string;
  score_domain: number;
  score_deal: number;
  score_recency: number;
  deal_type_detected: DealType;
  relevance_score: number;
  credibility_score: number;
  source_tier: number | null;
  credibility_flag: string;
}

export type DealType =
  | 'Acquisition'
  | 'Merger'
  | 'Investment'
  | 'Divestiture'
  | 'Stake Acquisition'
  | 'Joint Venture'
  | 'Other';

// ── Pipeline job types ────────────────────────────────────────────────────────
export type JobState = 'pending' | 'running' | 'complete' | 'error';

export interface ProgressEvent {
  stage: string;
  input: number;
  output: number;
  message: string;
}

export interface JobStatus {
  job_id: string;
  state: JobState;
  progress: ProgressEvent[];
  error: string | null;
  summary: PipelineSummary | null;
  output_files: Record<string, string> | null;
}

export interface PipelineSummary {
  total_input: number;
  after_dedup: number;
  after_relevance: number;
  final_count: number;
  blocked: number;
  dropped: number;
  type_breakdown: Record<string, number>;
  domain_name: string;
}

// ── API response types ────────────────────────────────────────────────────────
export interface UploadResponse {
  file_id: string;
  filename: string;
  columns: string[];
  row_count: number;
  preview: Record<string, string>[];
}

export interface ResultsSummaryResponse {
  summary: PipelineSummary;
  articles: Article[];
  progress: ProgressEvent[];
}

export interface PipelineConfig {
  domain_name: string;
  col_title: string;
  col_body: string;
  col_source: string;
  col_date: string;
  col_url: string;
  col_category: string;
  primary_keywords: string[];
  secondary_keywords: string[];
  deal_primary_keywords: string[];
  deal_secondary_keywords: string[];
  deal_type_labels: Record<string, string>;
  source_tier1: string[];
  source_tier2: string[];
  source_tier3: string[];
  blocklist: string[];
  min_relevance_score: number;
  dedup_threshold: number;
}

// ── UI state types ────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FilterState {
  dealType: string;
  source: string;
  dateRange: '7d' | '30d' | '90d' | 'all';
  search: string;
  minScore: number;
}

export interface KPIData {
  totalDeals: number;
  topBrand: string;
  avgScore: number;
  avgCredibility: number;
  typeBreakdown: Record<string, number>;
  survivalRate: number;
}

// ── Trend / chart data ────────────────────────────────────────────────────────
export interface TrendPoint {
  date: string;
  acquisitions: number;
  investments: number;
  divestitures: number;
  total: number;
}
