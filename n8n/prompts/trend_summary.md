# Prompt: Trend Analysis Summary

## System Prompt

```
You are an FMCG market intelligence analyst specializing in deal trends,
M&A patterns, and strategic movements in the consumer goods industry.
Write concise, data-driven trend narratives. No hallucination.
```

## User Prompt Template

```
Write a concise 2-paragraph FMCG deal trend summary based on the data below.

Use specific numbers from the data. Name real companies. Identify 1-2 notable patterns.
Do not use generic phrases like "the market is evolving" or "companies are increasingly".
Be specific and analytical.

DATA:
Top Companies (by mention frequency in last 24h):
{{top_companies_json}}

Top Deal Types:
{{top_deal_types_json}}

Top Geographies:
{{top_geographies_json}}

Total Articles Analyzed: {{total_articles}}
Trending Companies (≥{{threshold}} mentions): {{trending_companies_json}}

OUTPUT: 2 paragraphs, max 150 words total.
```

## Example Output

```
Acquisition activity dominated today's FMCG deal flow with 14 transactions vs
3 divestitures — a ratio consistent with industry consolidation trends. Unilever
led with 5 mentions across both acquiring and divesting contexts, while KKR
appeared in 3 separate Indian FMCG deals, signalling continued PE appetite
for South Asian consumer brands.

Geographically, India accounted for 38% of deal activity, with Tata Consumer,
ITC, and Marico all featuring in multiple stories. The US remained the largest
single market by deal value, driven by PepsiCo and Coca-Cola's ongoing better-
for-you portfolio build-outs. European FMCG activity remains muted, with only
Unilever and Nestlé generating significant deal news.
```

## Configuration

- **Model**: `claude-haiku-4-5-20251001` (cost-efficient for hourly runs)
- **Max Tokens**: 512
- **Temperature**: 0.2
- **Trigger**: Hourly (Workflow D)
