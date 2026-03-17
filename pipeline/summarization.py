"""
Stage 5 – Summarization
Generates a concise 2–3 line AI summary for each article using extractive
techniques. Highlights: company name, deal type, and deal value if present.
No external API required — fully deterministic and offline.
"""

import re
from .config import PipelineConfig, DEFAULT_FMCG_CONFIG

# Value/amount patterns: "$1.2B", "₹4,500 crore", "€800M", "USD 2 billion"
_VALUE_RE = re.compile(
    r"""
    (?:USD|EUR|GBP|INR|JPY|₹|\$|€|£)?   # currency symbol/code
    \s*
    (?:\d[\d,]*(?:\.\d+)?)               # numeric amount  e.g. 1,200 or 4.5
    \s*
    (?:billion|million|crore|lakh|bn|mn|m|b|k)?  # scale
    \s*
    (?:USD|EUR|GBP|INR)?                 # trailing currency
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Sentence splitter (handles "Inc." "Ltd." etc.)
_SENT_RE = re.compile(r'(?<![A-Z][a-z])\.\s+(?=[A-Z])')


def _split_sentences(text: str) -> list[str]:
    sentences = _SENT_RE.split(text)
    result = []
    for s in sentences:
        s = s.strip()
        if s and len(s) > 20:
            result.append(s)
    return result


def _extract_value(text: str) -> str:
    """Return first monetary value found in text, or empty string."""
    matches = _VALUE_RE.findall(text)
    for m in matches:
        cleaned = m.strip()
        # Must contain at least one digit
        if re.search(r'\d', cleaned):
            return cleaned
    return ""


def _extract_company(text: str, config: PipelineConfig) -> str:
    """Return the first primary-keyword entity found in the text."""
    text_lower = text.lower()
    for kw in config.primary_keywords:
        if kw.lower() in text_lower:
            # Capitalise properly for display
            idx = text_lower.find(kw.lower())
            return text[idx: idx + len(kw)].title()
    return ""


def _score_sentence(sentence: str, config: PipelineConfig) -> float:
    """Score a sentence by keyword density for extractive selection."""
    text_lower = sentence.lower()
    score = 0.0
    for kw in config.deal_primary_keywords:
        if kw.lower() in text_lower:
            score += 3.0
    for kw in config.primary_keywords:
        if kw.lower() in text_lower:
            score += 2.0
    for kw in config.secondary_keywords:
        if kw.lower() in text_lower:
            score += 1.0
    for kw in config.deal_secondary_keywords:
        if kw.lower() in text_lower:
            score += 0.5
    # Bonus for containing a value
    if _VALUE_RE.search(sentence):
        score += 2.0
    return score


def _extractive_summary(article: dict, config: PipelineConfig, max_sentences: int = 2) -> str:
    """
    Pick the top-scoring sentences from the article body.
    Falls back to truncated title + first sentence if body is short.
    """
    full_text = article.get("full_text", "") or article.get("summary", "") or ""
    title = article.get("title", "")

    sentences = _split_sentences(full_text)
    if not sentences:
        # Last resort: just return first 180 chars of title
        return (title[:180] + "…") if len(title) > 180 else title

    # Score and rank
    scored = sorted(
        [(s, _score_sentence(s, config)) for s in sentences],
        key=lambda x: -x[1],
    )

    # Take top max_sentences, re-ordered by original position
    top = set(s for s, _ in scored[:max_sentences])
    selected = [s for s in sentences if s in top][:max_sentences]

    if not selected:
        selected = sentences[:max_sentences]

    summary = " ".join(selected)
    # Truncate at 320 chars
    if len(summary) > 320:
        summary = summary[:317] + "…"
    return summary


def summarize_article(article: dict, config: PipelineConfig) -> dict:
    """Enrich one article with ai_summary, company, deal_value fields."""
    full_text = article.get("full_text", "") + " " + article.get("title", "")

    article["ai_summary"]  = _extractive_summary(article, config, max_sentences=2)
    article["company"]     = _extract_company(full_text, config) or article.get("source", "")
    article["deal_value"]  = _extract_value(full_text)
    return article


def summarize(
    articles: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> list[dict]:
    """
    Stage 5 – Run extractive summarization over all articles.
    Adds: ai_summary, company, deal_value fields to each article.
    """
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    enriched = [summarize_article(article, config) for article in articles]

    msg = f"Generated summaries for {len(enriched)} articles"
    print(f"[Summarize] {msg}")
    if progress_cb:
        progress_cb("summarization", len(enriched), len(enriched), msg)

    return enriched
