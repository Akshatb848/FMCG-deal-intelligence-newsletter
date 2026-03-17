"""
Stage 3 – Relevance Scoring
Assigns each article a relevance score (0–100) and a deal-type label,
then filters out articles that are clearly off-topic.

Scoring model (rule-based, transparent)
----------------------------------------
The score is the sum of sub-scores capped at 100:

  A. FMCG sector match       (0–40 pts)
     Keywords spanning food, beverage, personal care, household, tobacco.
     Matches scored by weight: primary brands/companies (2 pts each),
     sector nouns (1.5 pts each), capped at 40.

  B. Deal-activity match     (0–40 pts)
     Keywords indicating M&A, investments, divestitures, joint ventures.
     Weighted similarly, capped at 40.

  C. Recency bonus           (0–10 pts)
     Articles published within the last 7 days receive up to 10 pts;
     within 14 days up to 5 pts; older articles 0 pts.

  D. Source credibility      (0–10 pts)
     Imported from the credibility module.

Threshold
---------
Articles with a combined FMCG + deal score below MIN_RELEVANCE_SCORE are
dropped.  We set this at 25 (out of 80 possible from A+B) so obviously
off-topic articles (stock prices, macro news, tech) are removed while
borderline-relevant ones (regulatory blocks on FMCG deals) are kept.
"""

from datetime import date, datetime

MIN_RELEVANCE_SCORE = 8   # minimum A+B score to pass the relevance filter

# ── A. FMCG sector keywords ──────────────────────────────────────────────────

# Primary: well-known FMCG companies / brands (higher weight)
FMCG_COMPANIES = {
    "unilever", "nestle", "nestlé", "procter", "gamble", "p&g", "pg",
    "coca-cola", "cocacola", "pepsi", "pepsico", "ab inbev", "abinbev",
    "diageo", "kraft heinz", "kraftheinz", "mondelez", "mars", "ferrero",
    "reckitt", "keurig", "dr pepper", "general mills", "danone", "tyson",
    "l'oreal", "loreal", "estee lauder", "colgate", "palmolive",
    "henkel", "givaudan", "haldirams", "haldiram", "lactalis", "valeo",
    "hindustan unilever", "hul", "pond's", "ponds",
    # Deal targets
    "minimalist", "notco", "bodyarmor", "body armor", "farmacy",
    "siete foods", "siete", "clif bar", "clifbar", "ghost energy",
    "nudges", "maxwell house", "aesop", "tom ford", "altos agave",
    "wells enterprises", "blue bunny", "halo top", "sara lee",
    "treehouse foods", "constellation brands",
}

# Secondary: FMCG sector nouns
FMCG_SECTORS = {
    "fmcg", "consumer goods", "consumer staples", "packaged goods",
    "packaged food", "food", "beverage", "beverages", "snacks", "snack",
    "skincare", "skin care", "beauty", "personal care", "household",
    "dairy", "confectionery", "chocolate", "beer", "spirits", "wine",
    "nutrition", "pet food", "ice cream", "coffee", "energy drink",
    "plant-based", "plant based", "alternative protein", "flavour",
    "fragrance", "grocery",
}

# ── B. Deal activity keywords ────────────────────────────────────────────────

DEAL_TYPES_PRIMARY = {
    "acquires", "acquisition", "acquired", "acquire",
    "merger", "merges", "merged",
    "takeover", "buyout",
    "invests", "investment", "invested",
    "raises", "funding round", "series a", "series b", "series c", "series d",
    "divests", "divestiture", "divestment", "sells", "sold",
    "joint venture", "jv", "partnership",
    "stake", "majority stake", "minority stake",
    "private equity", "pe firm", "kkr", "bain capital", "cvc capital",
    "advent international",
}

DEAL_TYPES_SECONDARY = {
    "deal", "transaction", "bid", "offer", "valuation", "integration",
    "portfolio", "consolidate", "consolidation", "spin-off", "carve-out",
    "ipo", "public offering",
}

# Deal type classification for newsletter grouping
DEAL_TYPE_LABELS = {
    "merger": "Merger",
    "merges": "Merger",
    "merged": "Merger",
    "acquires": "Acquisition",
    "acquisition": "Acquisition",
    "acquired": "Acquisition",
    "acquire": "Acquisition",
    "takeover": "Acquisition",
    "buyout": "Acquisition",
    "invests": "Investment",
    "investment": "Investment",
    "invested": "Investment",
    "funding round": "Investment",
    "series a": "Investment",
    "series b": "Investment",
    "series c": "Investment",
    "series d": "Investment",
    "raises": "Investment",
    "divests": "Divestiture",
    "divestiture": "Divestiture",
    "divestment": "Divestiture",
    "sells": "Divestiture",
    "sold": "Divestiture",
    "joint venture": "Joint Venture",
    "stake": "Stake Acquisition",
    "majority stake": "Stake Acquisition",
    "minority stake": "Stake Acquisition",
}


def _text_tokens(text: str) -> set[str]:
    """Return a set of lowercased n-grams (1 and 2) from text for matching."""
    text = text.lower()
    words = text.split()
    tokens = set(words)
    # Add bigrams
    tokens.update(" ".join(words[i : i + 2]) for i in range(len(words) - 1))
    # Add trigrams for compound phrases
    tokens.update(" ".join(words[i : i + 3]) for i in range(len(words) - 2))
    return tokens


def _fmcg_score(tokens: set[str]) -> float:
    """Score for FMCG sector relevance (0–40)."""
    score = 0.0
    for company in FMCG_COMPANIES:
        if any(company in t for t in tokens) or company in " ".join(tokens):
            score += 2.0
    for sector in FMCG_SECTORS:
        if any(sector in t for t in tokens):
            score += 1.5
    return min(score, 40.0)


def _deal_score(tokens: set[str]) -> tuple[float, str]:
    """Score for deal-activity relevance (0–40) and infer deal type label."""
    score = 0.0
    detected_label = "Other"

    for kw in DEAL_TYPES_PRIMARY:
        if any(kw in t for t in tokens):
            score += 2.5
            if kw in DEAL_TYPE_LABELS and detected_label == "Other":
                detected_label = DEAL_TYPE_LABELS[kw]

    for kw in DEAL_TYPES_SECONDARY:
        if any(kw in t for t in tokens):
            score += 1.0

    return min(score, 40.0), detected_label


def _recency_bonus(date_str: str) -> float:
    """Recency bonus (0–10)."""
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


def score_article(article: dict) -> dict:
    """Compute all scores and attach them to the article dict."""
    tokens = _text_tokens(article["full_text"])

    fmcg_s = _fmcg_score(tokens)
    deal_s, deal_label = _deal_score(tokens)
    recency_s = _recency_bonus(article.get("published_date", ""))

    # Credibility score injected by the credibility module later;
    # placeholder 5 used for pure relevance filtering here.
    credibility_s = 5.0

    total = min(fmcg_s + deal_s + recency_s + credibility_s, 100.0)

    article["score_fmcg"] = round(fmcg_s, 1)
    article["score_deal"] = round(deal_s, 1)
    article["score_recency"] = round(recency_s, 1)
    article["deal_type_detected"] = deal_label
    article["relevance_score"] = round(total, 1)

    return article


def filter_relevance(articles: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Public entry-point for Stage 3.
    Returns (relevant_articles, filtered_out_articles).
    """
    relevant, dropped = [], []
    for article in articles:
        scored = score_article(article)
        if scored["score_fmcg"] + scored["score_deal"] >= MIN_RELEVANCE_SCORE:
            relevant.append(scored)
        else:
            dropped.append(scored)

    # Sort by relevance score descending for newsletter ordering
    relevant.sort(key=lambda a: a["relevance_score"], reverse=True)

    print(
        f"[Relevance] {len(articles)} → {len(relevant)} articles kept "
        f"({len(dropped)} below relevance threshold of {MIN_RELEVANCE_SCORE})"
    )
    return relevant, dropped
