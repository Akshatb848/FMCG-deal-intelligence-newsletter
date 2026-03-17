"""
Stage 4 – Credibility Checking
Assigns source credibility scores using user-configured tier lists.
Fully domain-agnostic — no hardcoded source names.
"""

import re
from .config import PipelineConfig, DEFAULT_FMCG_CONFIG

TIER_SCORES = {1: 9, 2: 7, 3: 5}
UNKNOWN_SCORE = 3
BLOCKED_SCORE = 0


def _normalise_source(source: str) -> str:
    s = source.lower().strip()
    s = re.sub(r"https?://", "", s)
    s = re.sub(r"^www\.", "", s)
    return s


def _assign_tier(source: str, config: PipelineConfig) -> tuple[int | None, int]:
    s = _normalise_source(source)

    for blocked in config.blocklist:
        if blocked.lower() in s:
            return None, BLOCKED_SCORE

    for keyword in config.source_tier1:
        if keyword.lower() in s:
            return 1, TIER_SCORES[1]

    for keyword in config.source_tier2:
        if keyword.lower() in s:
            return 2, TIER_SCORES[2]

    for keyword in config.source_tier3:
        if keyword.lower() in s:
            return 3, TIER_SCORES[3]

    return 0, UNKNOWN_SCORE


def check_credibility(
    articles: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> tuple[list[dict], list[dict]]:
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    credible, blocked = [], []

    for article in articles:
        source_str = article.get("source", "") + " " + article.get("url", "")
        tier, score = _assign_tier(source_str, config)

        article["credibility_score"] = score
        article["source_tier"] = tier

        if tier is None:
            article["credibility_flag"] = "BLOCKED – known unreliable source"
            blocked.append(article)
        elif tier == 0:
            article["credibility_flag"] = "UNKNOWN – requires human review"
            credible.append(article)
        else:
            article["credibility_flag"] = f"Tier {tier} – verified outlet"
            credible.append(article)

        # Replace relevance_score placeholder (5.0) with real credibility score
        if "relevance_score" in article:
            article["relevance_score"] = round(
                article["relevance_score"] - 5.0 + score, 1
            )

    msg = (
        f"{len(articles)} → {len(credible)} records "
        f"({len(blocked)} hard-blocked from unreliable sources)"
    )
    print(f"[Credibility] {msg}")
    if progress_cb:
        progress_cb("credibility", len(articles), len(credible), msg)
    return credible, blocked
