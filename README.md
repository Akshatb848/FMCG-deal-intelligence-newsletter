# FMCG Deal Intelligence Newsletter Pipeline

An end-to-end agent-style pipeline that ingests deal-related news, removes duplicates, scores relevance and source credibility, and outputs a formatted newsletter covering M&A, investments, and divestitures in the FMCG sector.

---

## Quick Start

```bash
pip install -r requirements.txt
python main.py                          # uses bundled sample dataset
python main.py --data path/to/file.csv  # custom CSV input
python main.py --output my_output/      # custom output directory
```

**Outputs** are written to `output/`:
| File | Description |
|------|-------------|
| `processed_articles.json` | Full scored dataset (JSON) |
| `processed_articles.csv`  | Full scored dataset (CSV) |
| `FMCG_Deal_Newsletter.xlsx` | 4-sheet Excel newsletter workbook |

---

## Pipeline Architecture

```
Raw CSV / News Feed
       │
       ▼
┌─────────────────────────────────┐
│  Stage 1 – Ingestion            │  pipeline/ingestion.py
│  Load & normalise articles      │
│  (field validation, date parse) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Stage 2 – De-duplication       │  pipeline/dedup.py
│  A) Exact dedup via title hash  │
│  B) Near-dedup: TF-IDF cosine   │
│     similarity ≥ 0.20           │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Stage 3 – Relevance Scoring    │  pipeline/relevance.py
│  FMCG keyword score   (0–40)    │
│  Deal keyword score   (0–40)    │
│  Recency bonus        (0–10)    │
│  Threshold: ≥ 8 (FMCG+Deal)    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Stage 4 – Credibility Check    │  pipeline/credibility.py
│  3-tier source whitelist        │
│  Hard-block known rumour sites  │
│  Score 0–10 per article         │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Stage 5 – Newsletter Generator │  pipeline/newsletter.py
│  JSON + CSV output              │
│  Excel: 4-sheet workbook        │
└─────────────────────────────────┘
```

---

## Stage Details & Design Decisions

### Stage 1 – Ingestion

Loads articles from CSV or JSON. In production this would call live APIs
(NewsAPI, Bloomberg Terminal, Reuters Connect, RSS feeds). The bundled
`data/raw_articles.csv` provides a realistic simulated dataset of 38 articles
including intentional duplicates, near-duplicates, and off-topic entries for
demonstrating the pipeline.

Each record is normalised: field names lowercased, dates parsed to ISO-8601,
and a `full_text` field (title + summary) created for downstream NLP.

---

### Stage 2 – De-duplication

**Exact dedup** hashes the canonical title (lowercased, punctuation removed).
Identical hashes collapse to the highest-credibility source version.

**Near-dedup** builds a TF-IDF matrix (bigrams, sublinear TF, max 5,000
features) over `full_text` and computes pairwise cosine similarity.

**Threshold = 0.20.** Calibration finding: FMCG deal articles about the *same
story* from different news wires typically score 0.20–0.53 due to vocabulary
variation (e.g. "buys" vs. "acquires" vs. "purchases"). Genuinely different
deals score < 0.15. The 0.20 cut-off cleanly separates same-story clusters
from distinct deals without false positives.

Duplicate clusters are resolved by keeping the article from the
highest-credibility source tier.

**Result on sample data:** 38 → 30 articles (8 near-duplicates removed).
Examples collapsed:
- Coca-Cola / BodyArmor (3 articles → 1, FT version kept)
- Nestlé / NotCo (2 articles → 1, Bloomberg kept)
- KKR / Haldiram's (2 articles → 1, Economic Times kept)

---

### Stage 3 – Relevance Scoring

Each article receives three sub-scores:

| Sub-score | Range | Signal |
|-----------|-------|--------|
| FMCG sector match | 0–40 | Hits against a curated list of FMCG company names and sector nouns (food, beverage, skincare, household…) |
| Deal activity match | 0–40 | Hits against M&A / investment / divestiture vocabulary |
| Recency bonus | 0–10 | ≤7 days old → 10 pts; ≤14 days → 5 pts; older → 0 |

**Filter threshold = 8** (combined FMCG + deal score). Articles below this
are dropped as off-topic. Correctly removed in the sample:

| Article | Why dropped |
|---------|-------------|
| Dollar General earnings | No deal activity |
| Brazil interest rates | Macro, no FMCG/deal signal |
| Amazon Go store expansion | Retail tech, no deal signal |
| UK CMA Sainsbury-Asda block | Regulatory, not a deal itself |
| Smartphone shipments | Tech sector |

---

### Stage 4 – Credibility Check

A three-tier source whitelist assigns a credibility score (0–10):

| Tier | Score | Examples |
|------|-------|---------|
| 1 | 9 | Reuters, Bloomberg, Financial Times, WSJ |
| 2 | 7 | CNBC, BBC, Forbes, Economic Times, Mint |
| 3 | 5 | PE Hub, VCCircle, Drinks Business, TechCrunch |
| Unknown | 3 | Sources not in the whitelist (flagged for review) |
| Blocked | 0 | Known rumour / spam sites (hard-filtered) |

**Assumption:** Credibility reflects *outlet reputation*, not individual
article accuracy. A Tier-1 source can still publish unverified information;
human editorial review remains necessary for high-stakes decisions.

**Sample result:** 1 article hard-blocked (DealRumors.net / fabricated
Mars-Marriott rumour).

---

### Stage 5 – Newsletter Generation

The Excel workbook contains four sheets:

| Sheet | Contents |
|-------|----------|
| **Newsletter** | Formatted newsletter draft with KPI banner, editorial note, and deal articles grouped by type |
| **Deal Summary** | Pivot table of deals by type + bar chart |
| **All Articles** | Full scored dataset for analyst reference |
| **Pipeline Log** | Stage-by-stage record counts and methodology notes |

---

## Output Fields (JSON / CSV)

| Field | Description |
|-------|-------------|
| `id` | Article identifier |
| `title` | Article headline |
| `source` | Publication name |
| `published_date` | ISO-8601 date |
| `url` | Source URL |
| `full_text` | Title + summary (used for NLP) |
| `deal_type_detected` | Acquisition / Investment / Divestiture / Merger / Other |
| `score_fmcg` | FMCG keyword score (0–40) |
| `score_deal` | Deal keyword score (0–40) |
| `score_recency` | Recency bonus (0–10) |
| `credibility_score` | Source credibility score (0–10) |
| `source_tier` | 1 / 2 / 3 / 0=unknown / None=blocked |
| `credibility_flag` | Human-readable credibility note |
| `relevance_score` | Composite score (0–100) |

---

## Sample Run Results

```
38 raw articles ingested
 → 30 after de-duplication  (8 near-duplicates removed)
 → 25 after relevance filter (5 off-topic removed)
 → 24 after credibility check (1 hard-blocked)

Deal breakdown: 15 Acquisitions · 4 Divestitures · 2 Investments
                1 Stake Acquisition · 1 Merger · 1 Market Trend
```

---

## Extending the Pipeline

| Extension | Where to change |
|-----------|----------------|
| Live news API | `pipeline/ingestion.py` → add API client |
| Semantic near-dedup (sentence embeddings) | `pipeline/dedup.py` → swap TF-IDF for `sentence-transformers` |
| ML-based relevance classifier | `pipeline/relevance.py` → replace keyword scorer |
| Additional output formats (Word / PPT) | `pipeline/newsletter.py` → add `python-docx` / `python-pptx` export |
| Email delivery | `main.py` → add SMTP send after `newsletter.generate()` |

---

## Transparent Assumptions

1. **No live data** – sample dataset simulates a real-world news feed.
2. **Keyword scoring only** – rule-based, interpretable, no model dependency.
3. **Source credibility ≠ article accuracy** – outlet tier is a proxy only.
4. **Cosine similarity threshold** is calibrated on the sample data; a larger corpus may need re-tuning.
5. **Deal values** are as reported by sources; no FX normalisation applied.
