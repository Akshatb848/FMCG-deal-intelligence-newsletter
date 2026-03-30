/**
 * Supabase database type definitions.
 * Auto-generation command (once Supabase project is set up):
 *   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > types/supabase.ts
 *
 * Hand-maintained version below — keep in sync with supabase/migrations/001_initial_schema.sql
 */

export interface Database {
  public: {
    Tables: {
      news_raw: {
        Row: {
          id:               string;
          title:            string;
          url:              string;
          content:          string | null;
          source:           string | null;
          author:           string | null;
          published_at:     string | null;
          content_hash:     string;
          is_duplicate:     boolean;
          duplicate_of:     string | null;
          is_relevant:      boolean | null;
          is_processed:     boolean;
          ingestion_source: string | null;
          raw_feed_url:     string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['news_raw']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['news_raw']['Row']>;
      };

      news_processed: {
        Row: {
          id:               string;
          raw_id:           string;
          headline:         string;
          summary:          string | null;
          category:         'Deals' | 'Trends' | 'Product Launch' | 'Regulatory' | 'Other' | null;
          companies:        string[];        // JSONB stored as array
          deal_type:        DealType | null;
          geography:        string | null;
          deal_value:       string | null;
          key_insights:     string[];        // JSONB stored as array
          confidence_score: number | null;
          trending_flag:    boolean;
          trend_score:      number;
          cluster_id:       string | null;
          published:        boolean;
          published_at:     string | null;
          source:           string | null;
          original_url:     string | null;
          article_date:     string | null;
          ai_model:         string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['news_processed']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['news_processed']['Row']>;
      };

      company_mentions: {
        Row: {
          id:           string;
          company_name: string;
          article_id:   string;
          mention_type: MentionType | null;
          created_at:   string;
        };
        Insert: Omit<Database['public']['Tables']['company_mentions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['company_mentions']['Row']>;
      };

      trend_snapshots: {
        Row: {
          id:               string;
          snapshot_date:    string;
          window_hours:     number;
          top_companies:    CompanyFreq[];
          top_deal_types:   DealTypeFreq[];
          top_geographies:  GeoFreq[];
          trending_topics:  TrendingCompany[];
          total_articles:   number;
          trend_narrative:  string | null;
          created_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['trend_snapshots']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['trend_snapshots']['Row']>;
      };

      newsletters: {
        Row: {
          id:           string;
          title:        string;
          date_range:   string | null;
          edition:      string | null;
          content_text: string;
          content_html: string | null;
          article_ids:  string[];
          highlights:   NewsletterHighlightAI[];
          stats:        NewsletterStats | null;
          published_at: string;
          created_at:   string;
        };
        Insert: Omit<Database['public']['Tables']['newsletters']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['newsletters']['Row']>;
      };

      pipeline_runs: {
        Row: {
          id:                  string;
          workflow_name:       string;
          status:              'running' | 'success' | 'error';
          records_ingested:    number | null;
          records_deduped:     number | null;
          records_processed:   number | null;
          error_message:       string | null;
          started_at:          string;
          completed_at:        string | null;
          duration_ms:         number | null;
        };
        Insert: Omit<Database['public']['Tables']['pipeline_runs']['Row'], 'id' | 'started_at'>;
        Update: Partial<Database['public']['Tables']['pipeline_runs']['Row']>;
      };
    };

    Views: {
      v_news_feed: {
        Row: {
          id:               string;
          title:            string;
          summary:          string | null;
          category:         string | null;
          companies:        string[];
          deal_type:        string | null;
          geography:        string | null;
          deal_value:       string | null;
          key_insights:     string[];
          confidence_score: number | null;
          trending_flag:    boolean;
          trend_score:      number;
          source:           string | null;
          url:              string | null;
          published_at:     string | null;
          created_at:       string;
        };
      };
      v_company_activity: {
        Row: {
          company_name:   string;
          total_mentions: number;
          mentions_7d:    number;
          mentions_24h:   number;
          deal_types:     string[];
          geographies:    string[];
          last_seen_at:   string;
        };
      };
    };

    Functions: {
      get_pending_extraction: {
        Args: { p_limit?: number };
        Returns: Array<{
          id: string; title: string; url: string;
          content: string | null; source: string | null; published_at: string | null;
        }>;
      };
      upsert_news_raw: {
        Args: {
          p_title: string; p_url: string; p_content: string; p_source: string;
          p_published_at: string; p_content_hash: string;
          p_ingestion_source?: string; p_raw_feed_url?: string;
        };
        Returns: string;
      };
    };
  };
}

// ── Shared sub-types ──────────────────────────────────────────────────────────

export type DealType =
  | 'acquisition' | 'merger' | 'partnership' | 'expansion'
  | 'divestiture' | 'investment' | 'joint_venture' | 'ipo' | 'none';

export type MentionType =
  | 'acquirer' | 'target' | 'investor' | 'investee'
  | 'partner' | 'divesting' | 'mentioned' | 'unknown';

export interface CompanyFreq    { name: string; count: number }
export interface DealTypeFreq   { type: string; count: number }
export interface GeoFreq        { geo: string;  count: number }
export interface TrendingCompany { name: string; count: number }

export interface NewsletterHighlightAI {
  headline:   string;
  summary:    string | null;
  companies:  string[];
  deal_type:  string | null;
  url:        string | null;
}

export interface NewsletterStats {
  total_articles:     number;
  deals:              number;
  trends:             number;
  trending:           number;
}

// ── Convenience row types ─────────────────────────────────────────────────────

export type NewsProcessedRow   = Database['public']['Tables']['news_processed']['Row'];
export type TrendSnapshotRow   = Database['public']['Tables']['trend_snapshots']['Row'];
export type NewsletterRow      = Database['public']['Tables']['newsletters']['Row'];
export type CompanyActivityRow = Database['public']['Views']['v_company_activity']['Row'];
export type NewsFeedRow        = Database['public']['Views']['v_news_feed']['Row'];
