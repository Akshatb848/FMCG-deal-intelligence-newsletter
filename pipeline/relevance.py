"""
Stage 3 – Relevance Scoring
Scores each record using user-configured keywords and filters by threshold.
Fully domain-agnostic — no hardcoded FMCG keywords.
"""

from datetime import date, datetime
from .config import PipelineConfig, DEFAULT_FMCG_CONFIG


def _text_tokens(text: str) -> set[str]:
    text = text.lower()
    words = text.split()
    tokens = set(words)
    tokens.update(" ".join(words[i: i + 2]) for i in range(len(words) - 1))
    tokens.update(" ".join(words[i: i + 3]) for i in range(len(words) - 2))
    return tokens


def _keyword_score(tokens: set[str], primary: list, secondary: list) -> float:
    score = 0.0
    for kw in primary:
        kw_lower = kw.lower()
        if any(kw_lower in t for t in tokens) or kw_lower in " ".join(tokens):
            score += 2.0
    for kw in secondary:
        kw_lower = kw.lower()
        if any(kw_lower in t for t in tokens):
            score += 1.5
    return min(score, 40.0)


def _deal_score(tokens: set[str], config: PipelineConfig) -> tuple[float, str]:
    score = 0.0
    detected_label = "Other"
    for kw in config.deal_primary_keywords:
        kw_lower = kw.lower()
        if any(kw_lower in t for t in tokens):
            score += 2.5
            if kw_lower in config.deal_type_labels and detected_label == "Other":
                detected_label = config.deal_type_labels[kw_lower]
    for kw in config.deal_secondary_keywords:
        kw_lower = kw.lower()
        if any(kw_lower in t for t in tokens):
            score += 1.0
    return min(score, 40.0), detected_label


def _recency_bonus(date_str: str) -> float:
    try:
        pub_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return 0.0
    delta = (date.today() - pub_date).days
    if delta <= 7:
        return 10.0
    if delta <= 14:
        return 5.0
    return 0.0


def score_article(article: dict, config: PipelineConfig) -> dict:
    tokens = _text_tokens(article.get("full_text", ""))

    domain_s = _keyword_score(tokens, config.primary_keywords, config.secondary_keywords)
    deal_s, deal_label = _deal_score(tokens, config)
    recency_s = _recency_bonus(article.get("published_date", ""))
    credibility_s = 5.0  # placeholder; replaced in Stage 4

    total = min(domain_s + deal_s + recency_s + credibility_s, 100.0)

    article["score_domain"]   = round(domain_s, 1)
    article["score_deal"]     = round(deal_s, 1)
    article["score_recency"]  = round(recency_s, 1)
    article["deal_type_detected"] = deal_label
    article["relevance_score"]    = round(total, 1)
    return article


def filter_relevance(
    articles: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> tuple[list[dict], list[dict]]:
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    relevant, dropped = [], []
    for article in articles:
        scored = score_article(article, config)
        if scored["score_domain"] + scored["score_deal"] >= config.min_relevance_score:
            relevant.append(scored)
        else:
            dropped.append(scored)

    relevant.sort(key=lambda a: a["relevance_score"], reverse=True)

    msg = (
        f"{len(articles)} → {len(relevant)} records kept "
        f"({len(dropped)} below relevance threshold of {config.min_relevance_score})"
    )
    print(f"[Relevance] {msg}")
    if progress_cb:
        progress_cb("relevance", len(articles), len(relevant), msg)
    return relevant, dropped
