"""
Stage 6 – Newsletter Generation
Produces a structured FMCG Deal Intelligence newsletter as:
  - Python dict (used by /newsletter API endpoint)
  - Formatted text string (for display / export)

Newsletter structure:
  1. Header  — "FMCG Deal Intelligence – Daily Brief"
  2. Key Highlights — Top 3 deals with full context
  3. All Deals — Bullet format: company · deal type · summary
  4. Insights — Trend analysis derived from the deal mix
"""

from datetime import date
from collections import Counter
from .config import PipelineConfig, DEFAULT_FMCG_CONFIG


# ── Trend insight generator ───────────────────────────────────────────────────

_TREND_TEMPLATES = {
    "Acquisition": "Acquisition activity is prominent, signalling market consolidation.",
    "Investment":  "Significant funding rounds highlight investor confidence in the sector.",
    "Merger":      "Merger activity suggests strategic consolidation among key players.",
    "Divestiture": "Divestitures are under way as companies refocus on core portfolios.",
    "Stake Acquisition": "Stake acquisitions reflect cautious but committed market entry.",
    "Joint Venture": "Joint ventures point to collaborative growth strategies.",
}

_CATEGORY_INSIGHT = {
    "food": "Food & Beverage deals dominate — driven by shifting consumer preferences.",
    "beverage": "Beverage consolidation is accelerating, especially in energy and premium segments.",
    "beauty": "Beauty and personal care M&A is surging, led by premium D2C brands.",
    "skincare": "Skincare acquisitions reflect strong demand for science-backed products.",
    "beer": "Alcoholic beverage M&A is heating up across premiumisation plays.",
    "spirits": "Spirits sector M&A intensifying as global players seek premium positioning.",
    "dairy": "Dairy and nutrition deals reflect resilience in staple categories.",
    "snacks": "Snacking category M&A remains active as health-forward brands attract buyers.",
    "pet food": "Pet food is one of the fastest-growing deal categories.",
    "plant-based": "Plant-based food and beverage continues to attract significant capital.",
}


def _derive_insights(articles: list[dict], config: PipelineConfig) -> list[str]:
    insights: list[str] = []

    # Top deal type
    type_counts: Counter = Counter(a.get("deal_type_detected", "Other") for a in articles)
    top_type, top_count = type_counts.most_common(1)[0] if type_counts else ("Other", 0)
    if top_type in _TREND_TEMPLATES and top_count > 0:
        insights.append(f"📈 {_TREND_TEMPLATES[top_type]} "
                        f"({top_count} deal{'s' if top_count > 1 else ''} recorded this period)")

    # Category signal from text
    all_text = " ".join(
        (a.get("full_text", "") + a.get("summary", "")).lower()
        for a in articles
    )
    for kw, insight in _CATEGORY_INSIGHT.items():
        if kw in all_text and len(insights) < 4:
            insights.append(f"🔍 {insight}")

    # Volume signal
    n = len(articles)
    if n >= 15:
        insights.append(f"⚡ High deal volume ({n} records) suggests an active deal environment.")
    elif n >= 5:
        insights.append(f"📊 Moderate deal flow ({n} records) with targeted strategic moves.")

    # Small-cap / startup signal
    small_cap_kws = ["startup", "d2c", "seed", "angel", "series a", "series b"]
    if any(kw in all_text for kw in small_cap_kws):
        insights.append("💡 Rise in small-cap acquisitions and early-stage investments in new-age FMCG brands.")

    # Return at least one insight
    if not insights:
        insights.append("📌 No dominant trend identified — diverse deal activity across categories.")

    return insights[:5]


# ── Newsletter builder ────────────────────────────────────────────────────────

def build_newsletter(
    articles: list[dict],
    pipeline_log: list[dict],
    config: PipelineConfig | None = None,
) -> dict:
    """
    Returns a structured newsletter dict:
    {
      header, date, domain_name,
      key_highlights: [{title, company, deal_type, deal_value, summary, source, score}],
      all_deals: [{company, deal_type, summary, source, date, score}],
      insights: [str],
      pipeline_summary: [{stage, input, output, notes}]
    }
    """
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    sorted_articles = sorted(articles, key=lambda a: a.get("relevance_score", 0), reverse=True)

    # Key highlights – top 3
    top3 = sorted_articles[:3]
    key_highlights = []
    for a in top3:
        key_highlights.append({
            "title":      a.get("title", ""),
            "company":    a.get("company", "") or a.get("source", ""),
            "deal_type":  a.get("deal_type_detected", "Other"),
            "deal_value": a.get("deal_value", ""),
            "summary":    a.get("ai_summary", "") or a.get("summary", ""),
            "source":     a.get("source", ""),
            "published_date": a.get("published_date", ""),
            "url":        a.get("url", ""),
            "relevance_score": round(a.get("relevance_score", 0), 1),
            "credibility_score": a.get("credibility_score", 0),
        })

    # All deals – bullet list format
    all_deals = []
    for a in sorted_articles:
        company = a.get("company", "") or a.get("source", "")
        summary = a.get("ai_summary", "") or a.get("summary", "")
        # Truncate summary for bullet list
        if len(summary) > 160:
            summary = summary[:157] + "…"
        all_deals.append({
            "company":    company,
            "deal_type":  a.get("deal_type_detected", "Other"),
            "summary":    summary,
            "source":     a.get("source", ""),
            "published_date": a.get("published_date", ""),
            "deal_value": a.get("deal_value", ""),
            "relevance_score": round(a.get("relevance_score", 0), 1),
            "url":        a.get("url", ""),
        })

    insights = _derive_insights(articles, config)

    # Deal type breakdown
    type_counts: Counter = Counter(a.get("deal_type_detected", "Other") for a in articles)

    return {
        "header":       f"{config.domain_name} – Daily Brief",
        "date":         date.today().isoformat(),
        "domain_name":  config.domain_name,
        "total_deals":  len(articles),
        "key_highlights": key_highlights,
        "all_deals":    all_deals,
        "insights":     insights,
        "deal_type_breakdown": dict(type_counts),
        "pipeline_summary": pipeline_log,
    }


def newsletter_to_text(newsletter: dict) -> str:
    """Convert the structured newsletter dict to a human-readable text report."""
    lines = []
    sep = "=" * 60

    lines += [
        sep,
        f"  {newsletter['header'].upper()}",
        f"  Date: {newsletter['date']}  |  Total Deals: {newsletter['total_deals']}",
        sep,
        "",
    ]

    # Key highlights
    lines += ["🔥 KEY HIGHLIGHTS (Top 3 Deals)", "-" * 40]
    for i, h in enumerate(newsletter["key_highlights"], 1):
        value_str = f"  |  Value: {h['deal_value']}" if h.get("deal_value") else ""
        lines += [
            f"\n[{i}] {h['title']}",
            f"    Company : {h['company']}",
            f"    Type    : {h['deal_type']}{value_str}",
            f"    Source  : {h['source']}  ({h['published_date']})",
            f"    Summary : {h['summary']}",
            f"    Score   : {h['relevance_score']:.1f}",
        ]

    lines += ["", sep, "", "📊 ALL DEALS", "-" * 40]
    for a in newsletter["all_deals"]:
        value_str = f" [{a['deal_value']}]" if a.get("deal_value") else ""
        lines.append(
            f"• {a['company']} | {a['deal_type']}{value_str} — {a['summary']}"
            f"  [{a['source']}, {a['published_date']}]"
        )

    lines += ["", sep, "", "📈 INSIGHTS & TRENDS", "-" * 40]
    for insight in newsletter["insights"]:
        lines.append(f"  {insight}")

    lines += [
        "",
        sep,
        "  For internal use only. Generated by FMCG Deal Intelligence Platform.",
        sep,
    ]

    return "\n".join(lines)


def generate_newsletter(
    articles: list[dict],
    pipeline_log: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> dict:
    """Stage 6 entry point — returns the newsletter dict and stores text."""
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    newsletter = build_newsletter(articles, pipeline_log, config)
    newsletter["text"] = newsletter_to_text(newsletter)

    msg = f"Newsletter generated — {len(newsletter['key_highlights'])} highlights, {len(newsletter['insights'])} insights"
    print(f"[Newsletter] {msg}")
    if progress_cb:
        progress_cb("newsletter_gen", len(articles), len(articles), msg)

    return newsletter
