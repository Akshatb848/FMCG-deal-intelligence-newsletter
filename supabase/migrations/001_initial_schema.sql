-- ============================================================================
-- FMCG Deal Intelligence Platform — Supabase Schema
-- Migration: 001_initial_schema
-- ============================================================================
-- Run this in Supabase SQL Editor or via supabase db push

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: news_raw
-- Raw articles ingested from RSS feeds and NewsAPI before any AI processing
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_raw (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    url             TEXT NOT NULL,
    content         TEXT,
    source          TEXT,
    author          TEXT,
    published_at    TIMESTAMPTZ,
    -- Dedup fields
    content_hash    TEXT UNIQUE NOT NULL,   -- MD5 of URL; prevents duplicate inserts
    is_duplicate    BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of    UUID REFERENCES news_raw(id),
    -- Pipeline flags
    is_relevant     BOOLEAN,                -- NULL = not yet evaluated
    is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Metadata
    ingestion_source TEXT,                  -- 'rss' | 'newsapi'
    raw_feed_url     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: news_processed
-- AI-enriched articles with structured intelligence extracted by Claude
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_processed (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id           UUID NOT NULL REFERENCES news_raw(id) ON DELETE CASCADE,
    -- AI-extracted fields
    headline         TEXT NOT NULL,
    summary          TEXT,
    category         TEXT CHECK (category IN ('Deals', 'Trends', 'Product Launch', 'Regulatory', 'Other')),
    companies        JSONB NOT NULL DEFAULT '[]',    -- ["Unilever", "Target Corp"]
    deal_type        TEXT CHECK (deal_type IN (
                         'acquisition', 'merger', 'partnership', 'expansion',
                         'divestiture', 'investment', 'joint_venture', 'ipo', 'none'
                     )),
    geography        TEXT,
    deal_value       TEXT,                           -- e.g. "$1.2B", "₹500 crore"
    key_insights     JSONB NOT NULL DEFAULT '[]',    -- ["...", "..."]
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    -- Trend fields
    trending_flag    BOOLEAN NOT NULL DEFAULT FALSE,
    trend_score      INTEGER NOT NULL DEFAULT 0,
    cluster_id       TEXT,                           -- groups related articles
    -- Publishing
    published        BOOLEAN NOT NULL DEFAULT FALSE,
    published_at     TIMESTAMPTZ,
    -- Pass-through from raw
    source           TEXT,
    original_url     TEXT,
    article_date     TIMESTAMPTZ,
    -- Metadata
    ai_model         TEXT DEFAULT 'claude-sonnet-4-6',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: company_mentions
-- Knowledge graph: tracks which companies appear in which articles
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_mentions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    article_id   UUID NOT NULL REFERENCES news_processed(id) ON DELETE CASCADE,
    mention_type TEXT CHECK (mention_type IN (
                     'acquirer', 'target', 'investor', 'investee',
                     'partner', 'divesting', 'mentioned', 'unknown'
                 )) DEFAULT 'mentioned',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: trend_snapshots
-- Hourly/daily snapshots of trending topics and company activity
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_snapshots (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    window_hours      INTEGER NOT NULL DEFAULT 24,   -- lookback window
    top_companies     JSONB NOT NULL DEFAULT '[]',   -- [{name, count, deal_types}]
    top_deal_types    JSONB NOT NULL DEFAULT '[]',   -- [{type, count, pct}]
    top_geographies   JSONB NOT NULL DEFAULT '[]',   -- [{geo, count}]
    trending_topics   JSONB NOT NULL DEFAULT '[]',   -- [{topic, count, articles}]
    total_articles    INTEGER NOT NULL DEFAULT 0,
    trend_narrative   TEXT,                          -- Claude-generated text summary
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_date, window_hours)
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: newsletters
-- Published AI-generated newsletter digests
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletters (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    date_range    TEXT,                              -- "March 28 – March 29, 2026"
    edition       TEXT,                              -- "Daily" | "Weekly"
    content_text  TEXT NOT NULL,                     -- Full newsletter text (Markdown)
    content_html  TEXT,                              -- Optional HTML version
    article_ids   JSONB NOT NULL DEFAULT '[]',       -- UUID list of included articles
    highlights    JSONB NOT NULL DEFAULT '[]',       -- top 3 stories
    stats         JSONB,                             -- {total_deals, acquisitions, ...}
    published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: pipeline_runs
-- Audit log for all n8n workflow executions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name    TEXT NOT NULL,
    status           TEXT CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',
    records_ingested INTEGER DEFAULT 0,
    records_deduped  INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    error_message    TEXT,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    duration_ms      INTEGER
);

-- ============================================================================
-- INDEXES — optimise the most common query patterns
-- ============================================================================

-- news_raw
CREATE INDEX IF NOT EXISTS idx_news_raw_content_hash  ON news_raw (content_hash);
CREATE INDEX IF NOT EXISTS idx_news_raw_published_at  ON news_raw (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_raw_is_processed  ON news_raw (is_processed) WHERE is_processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_news_raw_is_relevant   ON news_raw (is_relevant) WHERE is_relevant = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_raw_created_at    ON news_raw (created_at DESC);

-- news_processed
CREATE INDEX IF NOT EXISTS idx_news_proc_category     ON news_processed (category);
CREATE INDEX IF NOT EXISTS idx_news_proc_deal_type    ON news_processed (deal_type);
CREATE INDEX IF NOT EXISTS idx_news_proc_published    ON news_processed (published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_proc_trending     ON news_processed (trending_flag) WHERE trending_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_proc_created_at   ON news_processed (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_proc_companies    ON news_processed USING gin (companies);
CREATE INDEX IF NOT EXISTS idx_news_proc_insights     ON news_processed USING gin (key_insights);

-- company_mentions
CREATE INDEX IF NOT EXISTS idx_company_mentions_name  ON company_mentions (company_name);
CREATE INDEX IF NOT EXISTS idx_company_mentions_art   ON company_mentions (article_id);
CREATE INDEX IF NOT EXISTS idx_company_mentions_date  ON company_mentions (created_at DESC);

-- Full-text search on headlines and summaries
CREATE INDEX IF NOT EXISTS idx_news_proc_headline_fts
    ON news_processed USING gin (to_tsvector('english', COALESCE(headline, '')));
CREATE INDEX IF NOT EXISTS idx_news_proc_summary_fts
    ON news_processed USING gin (to_tsvector('english', COALESCE(summary, '')));

-- Trigram index for fuzzy title matching (dedup workflow)
CREATE INDEX IF NOT EXISTS idx_news_raw_title_trgm
    ON news_raw USING gin (title gin_trgm_ops);

-- ============================================================================
-- VIEWS — convenience query layers for the API
-- ============================================================================

-- Published articles with all data needed for the /api/news endpoint
CREATE OR REPLACE VIEW v_news_feed AS
    SELECT
        np.id,
        np.headline     AS title,
        np.summary,
        np.category,
        np.companies,
        np.deal_type,
        np.geography,
        np.deal_value,
        np.key_insights,
        np.confidence_score,
        np.trending_flag,
        np.trend_score,
        np.source,
        np.original_url AS url,
        np.article_date AS published_at,
        np.created_at
    FROM news_processed np
    WHERE np.published = TRUE
    ORDER BY
        np.trending_flag DESC,
        CASE np.category
            WHEN 'Deals' THEN 1
            WHEN 'Trends' THEN 2
            WHEN 'Product Launch' THEN 3
            ELSE 4
        END,
        np.created_at DESC;

-- Company activity summary for the intelligence endpoint
CREATE OR REPLACE VIEW v_company_activity AS
    SELECT
        cm.company_name,
        COUNT(DISTINCT cm.article_id)                           AS total_mentions,
        COUNT(DISTINCT cm.article_id) FILTER (
            WHERE np.article_date >= NOW() - INTERVAL '7 days') AS mentions_7d,
        COUNT(DISTINCT cm.article_id) FILTER (
            WHERE np.article_date >= NOW() - INTERVAL '24 hours') AS mentions_24h,
        ARRAY_AGG(DISTINCT np.deal_type)
            FILTER (WHERE np.deal_type != 'none')               AS deal_types,
        ARRAY_AGG(DISTINCT np.geography)
            FILTER (WHERE np.geography IS NOT NULL)             AS geographies,
        MAX(np.created_at)                                      AS last_seen_at
    FROM company_mentions cm
    JOIN news_processed np ON np.id = cm.article_id
    WHERE np.published = TRUE
    GROUP BY cm.company_name
    ORDER BY total_mentions DESC;

-- ============================================================================
-- FUNCTIONS — helper functions for pipeline operations
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_news_raw_updated_at
    BEFORE UPDATE ON news_raw
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_news_processed_updated_at
    BEFORE UPDATE ON news_processed
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: upsert raw article (idempotent, safe for n8n retries)
CREATE OR REPLACE FUNCTION upsert_news_raw(
    p_title           TEXT,
    p_url             TEXT,
    p_content         TEXT,
    p_source          TEXT,
    p_published_at    TIMESTAMPTZ,
    p_content_hash    TEXT,
    p_ingestion_source TEXT DEFAULT 'rss',
    p_raw_feed_url    TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO news_raw (title, url, content, source, published_at, content_hash, ingestion_source, raw_feed_url)
    VALUES (p_title, p_url, p_content, p_source, p_published_at, p_content_hash, p_ingestion_source, p_raw_feed_url)
    ON CONFLICT (content_hash) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM news_raw WHERE content_hash = p_content_hash;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function: get unprocessed relevant articles ready for AI extraction
CREATE OR REPLACE FUNCTION get_pending_extraction(p_limit INT DEFAULT 20)
RETURNS TABLE (
    id UUID, title TEXT, url TEXT, content TEXT, source TEXT, published_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
        SELECT nr.id, nr.title, nr.url, nr.content, nr.source, nr.published_at
        FROM news_raw nr
        WHERE nr.is_processed = FALSE
          AND nr.is_duplicate = FALSE
          AND nr.is_relevant = TRUE
        ORDER BY nr.published_at DESC NULLS LAST
        LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production; service_role key bypasses RLS for n8n/backend
-- ============================================================================

ALTER TABLE news_raw         ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_processed   ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs    ENABLE ROW LEVEL SECURITY;

-- Public read-only access for published content (anon key)
CREATE POLICY "public_read_published"
    ON news_processed FOR SELECT
    USING (published = TRUE);

CREATE POLICY "public_read_snapshots"
    ON trend_snapshots FOR SELECT
    USING (TRUE);

CREATE POLICY "public_read_newsletters"
    ON newsletters FOR SELECT
    USING (TRUE);

-- Full access for service role (n8n, FastAPI backend use service key)
CREATE POLICY "service_full_access_raw"
    ON news_raw FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "service_full_access_processed"
    ON news_processed FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "service_full_access_mentions"
    ON company_mentions FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "service_full_access_snapshots"
    ON trend_snapshots FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "service_full_access_newsletters"
    ON newsletters FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "service_full_access_pipeline"
    ON pipeline_runs FOR ALL
    USING (auth.role() = 'service_role');
