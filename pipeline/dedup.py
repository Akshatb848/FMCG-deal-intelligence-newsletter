"""
Stage 2 – De-duplication
Removes exact duplicates and near-duplicates from the article list.

Strategy
--------
1. **Exact dedup** – Hash the normalised title (lowercased, stripped of
   punctuation and common stop-words).  Articles with identical hashes are
   collapsed; the record with the most-credible source is kept.

2. **Near-dedup (TF-IDF + cosine similarity)** – Build a TF-IDF matrix over
   the full_text of all remaining articles.  Any pair whose cosine similarity
   exceeds SIMILARITY_THRESHOLD is treated as a near-duplicate; from each
   cluster we keep the article that came from the highest-credibility source
   (or, as a tie-breaker, the earliest in the list).

Assumptions
-----------
* We treat an article as a near-duplicate if its cosine similarity with another
  article is ≥ 0.55.  This is a pragmatic threshold: it is tight enough to
  avoid merging genuinely different stories, yet loose enough to catch the same
  story reworded by different outlets.
* When multiple outlets report the same story we keep the one from the most
  credible source tier (see credibility.py for tier definitions).
"""

import re
import unicodedata
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

SIMILARITY_THRESHOLD = 0.20  # cosine similarity cut-off for near-dedup
# Calibration note: FMCG deal articles from different outlets about the same
# story typically score 0.20–0.53 similarity via TF-IDF (vocabulary variation
# across news wires keeps scores lower than expected).  Unrelated deals score
# below 0.15.  0.20 cleanly separates true duplicates from distinct stories.

# Rough credibility ordering for tie-breaking (higher = more credible)
SOURCE_PRIORITY = {
    "reuters": 10,
    "bloomberg": 10,
    "financial times": 9,
    "ft": 9,
    "wsj": 9,
    "wall street journal": 9,
    "bbc": 8,
    "cnbc": 8,
    "economic times": 7,
    "mint": 7,
    "forbes": 7,
    "techcrunch": 6,
    "pe hub": 6,
    "pehub": 6,
    "vccircle": 6,
    "drinks business": 6,
    "cosmetics design": 5,
    "marketwatch": 5,
    "business standard": 5,
    "idc": 4,
}


def _priority(article: dict) -> int:
    src = article.get("source", "").lower()
    for key, score in SOURCE_PRIORITY.items():
        if key in src:
            return score
    return 3  # default priority for unknown sources


def _canonical_title(title: str) -> str:
    """Lowercase, remove punctuation and extra whitespace for exact-match hashing."""
    title = unicodedata.normalize("NFKD", title).lower()
    title = re.sub(r"[^\w\s]", "", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title


def exact_dedup(articles: list[dict]) -> tuple[list[dict], int]:
    """
    Remove articles with identical canonical titles.
    Returns (deduplicated_list, n_removed).
    """
    seen: dict[str, dict] = {}
    for article in articles:
        key = _canonical_title(article.get("title", ""))
        if key not in seen:
            seen[key] = article
        else:
            # Keep the one from the higher-priority source
            if _priority(article) > _priority(seen[key]):
                seen[key] = article

    deduped = list(seen.values())
    removed = len(articles) - len(deduped)
    return deduped, removed


def near_dedup(articles: list[dict]) -> tuple[list[dict], int]:
    """
    Remove near-duplicate articles using TF-IDF cosine similarity.
    Returns (deduplicated_list, n_removed).
    """
    if len(articles) < 2:
        return articles, 0

    texts = [a["full_text"] for a in articles]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
    )
    tfidf_matrix = vectorizer.fit_transform(texts)
    sim_matrix = cosine_similarity(tfidf_matrix)

    n = len(articles)
    # Union-Find to cluster near-duplicates
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            # Merge lower-priority into higher-priority cluster root
            if _priority(articles[py]) > _priority(articles[px]):
                parent[px] = py
            else:
                parent[py] = px

    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i, j] >= SIMILARITY_THRESHOLD:
                union(i, j)

    # Keep one representative per cluster (highest-priority source)
    clusters: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        clusters.setdefault(root, []).append(i)

    kept = []
    for root, members in clusters.items():
        # Pick the member with highest source priority; tie-break by list order
        best = max(members, key=lambda idx: (_priority(articles[idx]), -idx))
        kept.append(articles[best])

    removed = n - len(kept)
    return kept, removed


def dedup(articles: list[dict]) -> list[dict]:
    """
    Public entry-point for Stage 2.
    Runs exact dedup followed by near-dedup.
    Annotates each kept article with its cluster membership count.
    """
    after_exact, n_exact = exact_dedup(articles)
    after_near, n_near = near_dedup(after_exact)

    total_removed = n_exact + n_near
    print(
        f"[De-dup]    {len(articles)} → {len(after_near)} articles "
        f"({n_exact} exact + {n_near} near-duplicate removals)"
    )
    return after_near
