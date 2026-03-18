"""
Stage 2 – De-duplication
Removes exact duplicates and near-duplicates using TF-IDF cosine similarity.
The similarity threshold is configurable via PipelineConfig.
"""

import re
import unicodedata
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .config import PipelineConfig, DEFAULT_FMCG_CONFIG


def _priority(article: dict, source_priority: dict) -> int:
    src = article.get("source", "").lower()
    for key, score in source_priority.items():
        if key in src:
            return score
    return 3


def _build_source_priority(config: PipelineConfig) -> dict:
    priority = {}
    for s in config.source_tier1:
        priority[s.lower()] = 10
    for s in config.source_tier2:
        priority[s.lower()] = 7
    for s in config.source_tier3:
        priority[s.lower()] = 5
    return priority


def _canonical_title(title: str) -> str:
    title = unicodedata.normalize("NFKD", title).lower()
    title = re.sub(r"[^\w\s]", "", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title


def exact_dedup(articles: list[dict], source_priority: dict) -> tuple[list[dict], int]:
    seen: dict[str, dict] = {}
    for article in articles:
        key = _canonical_title(article.get("title", ""))
        if key not in seen or _priority(article, source_priority) > _priority(seen[key], source_priority):
            seen[key] = article
    deduped = list(seen.values())
    return deduped, len(articles) - len(deduped)


def near_dedup(
    articles: list[dict],
    source_priority: dict,
    threshold: float = 0.20,
) -> tuple[list[dict], int]:
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
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            if _priority(articles[py], source_priority) > _priority(articles[px], source_priority):
                parent[px] = py
            else:
                parent[py] = px

    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i, j] >= threshold:
                union(i, j)

    clusters: dict[int, list[int]] = {}
    for i in range(n):
        clusters.setdefault(find(i), []).append(i)

    kept = [
        articles[max(members, key=lambda idx: (_priority(articles[idx], source_priority), -idx))]
        for members in clusters.values()
    ]
    return kept, n - len(kept)


def dedup(
    articles: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> list[dict]:
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    source_priority = _build_source_priority(config)
    after_exact, n_exact = exact_dedup(articles, source_priority)
    after_near, n_near = near_dedup(after_exact, source_priority, config.dedup_threshold)

    # Tag each surviving article with dedup metadata
    for a in after_near:
        a["dedup_flag"] = "original"
        a["dedup_method"] = (
            "exact_title_hash + tfidf_cosine"
            f" (threshold={config.dedup_threshold})"
        )

    msg = (
        f"{len(articles)} → {len(after_near)} records "
        f"({n_exact} exact + {n_near} near-duplicate removals)"
    )
    print(f"[De-dup]    {msg}")
    if progress_cb:
        progress_cb("dedup", len(articles), len(after_near), msg)
    return after_near
