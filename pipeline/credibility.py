"""
Stage 4 – Credibility Checking
Assigns a credibility score (0–10) to each article based on its source.

Credibility model (transparent, rule-based)
--------------------------------------------
We use a three-tier source whitelist:

  Tier 1 (score 9–10): Established financial newswires with editorial
    standards, corrections policies, and named journalists.
    → Reuters, Bloomberg, Financial Times, Wall Street Journal

  Tier 2 (score 7–8): Mainstream business / industry press with broad
    editorial oversight but narrower focus or occasional sponsored content.
    → CNBC, BBC, Forbes, Economic Times, Mint, Business Standard, Nikkei

  Tier 3 (score 5–6): Specialist trade / vertical press—credible within
    their domain but smaller editorial teams and narrower fact-checking.
    → PE Hub, VCCircle, Drinks Business, Cosmetics Design, MarketWatch,
      TechCrunch, Dealroom, IDC

  Unknown (score 3): Sources not in our whitelist.  We do NOT drop them
    automatically—a low score already suppresses them in ranking—but we
    flag them for human review.

  Flagged (score 0): Sources on a blocklist (known rumour/spam sites).
    These are hard-filtered from the output.

Assumptions
-----------
* URL-domain matching is attempted first; source-name substring matching
  is used as a fallback so the list stays readable.
* We do not perform live domain reputation checks (no API key required).
* Credibility of individual articles is not verified—only source reputation.
  A credible source can still publish incorrect information.
"""

import re

# ── Source tiers ─────────────────────────────────────────────────────────────

TIER_1 = {
    "reuters", "bloomberg", "financial times", "ft.com",
    "wall street journal", "wsj", "nikkei",
}

TIER_2 = {
    "cnbc", "bbc", "forbes", "economic times", "mint", "livemint",
    "business standard", "afp", "ap news", "associated press",
    "guardian", "new york times", "nyt", "handelsblatt",
}

TIER_3 = {
    "pe hub", "pehub", "vccircle", "drinks business", "cosmetics design",
    "techcrunch", "marketwatch", "dealroom", "idc", "statista",
    "just food", "food navigator", "food dive", "beverage daily",
    "cosmeticsbusiness", "happi",
}

# Hard-blocked domains / source names (rumour, spam, or unverified blogs)
BLOCKLIST = {
    "dealrumors.net", "dealrumors", "fakenews", "rumorsonly",
    "clickbait.io", "stocktipster",
}

TIER_SCORES = {1: 9, 2: 7, 3: 5}
UNKNOWN_SCORE = 3
BLOCKED_SCORE = 0


def _normalise_source(source: str) -> str:
    """Strip URL scheme, www prefix, and TLD for reliable matching."""
    s = source.lower().strip()
    s = re.sub(r"https?://", "", s)
    s = re.sub(r"^www\.", "", s)
    return s


def _assign_tier(source: str) -> tuple[int | None, int]:
    """
    Return (tier, score) for a given source string.
    tier=None means the source is on the blocklist.
    """
    s = _normalise_source(source)

    for blocked in BLOCKLIST:
        if blocked in s:
            return None, BLOCKED_SCORE

    for keyword in TIER_1:
        if keyword in s:
            return 1, TIER_SCORES[1]

    for keyword in TIER_2:
        if keyword in s:
            return 2, TIER_SCORES[2]

    for keyword in TIER_3:
        if keyword in s:
            return 3, TIER_SCORES[3]

    return 0, UNKNOWN_SCORE  # tier 0 = unknown


def check_credibility(articles: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Public entry-point for Stage 4.

    Annotates each article with:
      - credibility_score   (0–10)
      - source_tier         (1 / 2 / 3 / 0=unknown / None=blocked)
      - credibility_flag    (human-review note)

    Blocked sources are moved to the second return list (hard-filtered).
    Returns (credible_articles, blocked_articles).
    """
    credible, blocked = [], []

    for article in articles:
        source = article.get("source", "") + " " + article.get("url", "")
        tier, score = _assign_tier(source)

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

        # Update the composite relevance score with the real credibility score
        # (replacing the placeholder 5 used in relevance.py)
        if "relevance_score" in article:
            article["relevance_score"] = round(
                article["relevance_score"]
                - 5.0                          # remove placeholder
                + score,                       # add real score
                1,
            )

    print(
        f"[Credibility] {len(articles)} → {len(credible)} articles "
        f"({len(blocked)} hard-blocked from unreliable sources)"
    )
    return credible, blocked
