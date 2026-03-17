"""
Pipeline configuration dataclass.
All pipeline stages accept a PipelineConfig object so the pipeline
is fully domain-agnostic — no FMCG keywords are hardcoded here.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PipelineConfig:
    # ── Identity ──────────────────────────────────────────────────────────────
    domain_name: str = "Deal Intelligence"

    # ── Column mapping ────────────────────────────────────────────────────────
    # Maps standard pipeline field names to actual CSV column names.
    # Standard names: title, body, source, date, url, category
    col_title:    str = "title"
    col_body:     str = "summary"
    col_source:   str = "source"
    col_date:     str = "published_date"
    col_url:      str = "url"
    col_category: str = "category"

    # ── Domain entity keywords (high weight, 0–40 pts) ────────────────────────
    primary_keywords:   list = field(default_factory=list)
    secondary_keywords: list = field(default_factory=list)

    # ── Deal activity keywords ────────────────────────────────────────────────
    deal_primary_keywords:   list = field(default_factory=list)
    deal_secondary_keywords: list = field(default_factory=list)

    # Maps keyword → deal-type label for grouping in output
    deal_type_labels: dict = field(default_factory=dict)

    # ── Source credibility tiers ──────────────────────────────────────────────
    source_tier1: list = field(default_factory=list)   # score 9
    source_tier2: list = field(default_factory=list)   # score 7
    source_tier3: list = field(default_factory=list)   # score 5
    blocklist:    list = field(default_factory=list)   # score 0, hard-blocked

    # ── Thresholds ────────────────────────────────────────────────────────────
    min_relevance_score: float = 8.0    # combined primary+secondary min score
    dedup_threshold:     float = 0.20   # cosine similarity for near-dedup

    @classmethod
    def from_dict(cls, d: dict) -> "PipelineConfig":
        return cls(
            domain_name=d.get("domain_name", "Deal Intelligence"),
            col_title=d.get("col_title", "title"),
            col_body=d.get("col_body", "summary"),
            col_source=d.get("col_source", "source"),
            col_date=d.get("col_date", "published_date"),
            col_url=d.get("col_url", "url"),
            col_category=d.get("col_category", "category"),
            primary_keywords=d.get("primary_keywords", []),
            secondary_keywords=d.get("secondary_keywords", []),
            deal_primary_keywords=d.get("deal_primary_keywords", []),
            deal_secondary_keywords=d.get("deal_secondary_keywords", []),
            deal_type_labels=d.get("deal_type_labels", {}),
            source_tier1=d.get("source_tier1", []),
            source_tier2=d.get("source_tier2", []),
            source_tier3=d.get("source_tier3", []),
            blocklist=d.get("blocklist", []),
            min_relevance_score=float(d.get("min_relevance_score", 8.0)),
            dedup_threshold=float(d.get("dedup_threshold", 0.20)),
        )

    def to_dict(self) -> dict:
        return self.__dict__.copy()


# ── Default FMCG config (backwards-compatible with original CLI) ──────────────

DEFAULT_FMCG_CONFIG = PipelineConfig(
    domain_name="FMCG Deal Intelligence",
    col_title="title",
    col_body="summary",
    col_source="source",
    col_date="published_date",
    col_url="url",
    col_category="category",
    primary_keywords=[
        "unilever", "nestle", "nestlé", "procter", "gamble", "p&g",
        "coca-cola", "cocacola", "pepsi", "pepsico", "ab inbev",
        "diageo", "kraft heinz", "mondelez", "mars", "ferrero",
        "reckitt", "keurig", "dr pepper", "general mills", "danone",
        "tyson", "l'oreal", "loreal", "estee lauder", "colgate",
        "henkel", "haldirams", "haldiram", "lactalis",
        "hindustan unilever", "hul", "minimalist", "notco", "bodyarmor",
        "siete foods", "clif bar", "ghost energy",
    ],
    secondary_keywords=[
        "fmcg", "consumer goods", "consumer staples", "packaged goods",
        "packaged food", "food", "beverage", "beverages", "snacks",
        "skincare", "skin care", "beauty", "personal care", "household",
        "dairy", "confectionery", "chocolate", "beer", "spirits", "wine",
        "nutrition", "pet food", "ice cream", "coffee", "energy drink",
        "plant-based", "plant based", "grocery",
    ],
    deal_primary_keywords=[
        "acquires", "acquisition", "acquired", "acquire",
        "merger", "merges", "merged", "takeover", "buyout",
        "invests", "investment", "invested", "raises", "funding round",
        "series a", "series b", "series c", "series d",
        "divests", "divestiture", "divestment", "sells", "sold",
        "joint venture", "jv", "partnership", "stake",
        "majority stake", "minority stake", "private equity",
    ],
    deal_secondary_keywords=[
        "deal", "transaction", "bid", "offer", "valuation",
        "consolidate", "consolidation", "spin-off", "carve-out", "ipo",
    ],
    deal_type_labels={
        "merger": "Merger", "merges": "Merger", "merged": "Merger",
        "acquires": "Acquisition", "acquisition": "Acquisition",
        "acquired": "Acquisition", "acquire": "Acquisition",
        "takeover": "Acquisition", "buyout": "Acquisition",
        "invests": "Investment", "investment": "Investment",
        "invested": "Investment", "funding round": "Investment",
        "series a": "Investment", "series b": "Investment",
        "series c": "Investment", "series d": "Investment",
        "raises": "Investment",
        "divests": "Divestiture", "divestiture": "Divestiture",
        "divestment": "Divestiture", "sells": "Divestiture", "sold": "Divestiture",
        "joint venture": "Joint Venture",
        "stake": "Stake Acquisition",
        "majority stake": "Stake Acquisition",
        "minority stake": "Stake Acquisition",
    },
    source_tier1=["reuters", "bloomberg", "financial times", "ft.com", "wsj", "wall street journal", "nikkei"],
    source_tier2=["cnbc", "bbc", "forbes", "economic times", "mint", "livemint", "business standard", "guardian"],
    source_tier3=["pe hub", "pehub", "vccircle", "drinks business", "cosmetics design", "techcrunch", "marketwatch"],
    blocklist=["dealrumors.net", "dealrumors", "fakenews", "rumorsonly", "clickbait.io", "stocktipster"],
    min_relevance_score=8.0,
    dedup_threshold=0.20,
)
