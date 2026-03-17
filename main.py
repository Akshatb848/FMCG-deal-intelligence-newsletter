#!/usr/bin/env python3
"""
FMCG Deal Intelligence Newsletter – Main Pipeline Orchestrator
==============================================================

Entry point that wires together all five pipeline stages and produces the
output artefacts.

Usage
-----
    python main.py                          # uses default sample dataset
    python main.py --data path/to/file.csv  # custom CSV
    python main.py --data path/to/file.json # custom JSON
    python main.py --output my_output_dir   # custom output directory

Pipeline stages
---------------
  1. Ingestion    – load & normalise raw articles
  2. De-dup       – remove exact and near-duplicate articles
  3. Relevance    – score and filter articles for FMCG deal relevance
  4. Credibility  – score and hard-filter unreliable sources
  5. Newsletter   – generate JSON / CSV / Excel newsletter artefacts
"""

import argparse
import sys
from pipeline.ingestion    import ingest
from pipeline.dedup        import dedup
from pipeline.relevance    import filter_relevance
from pipeline.credibility  import check_credibility
from pipeline import newsletter


def run_pipeline(data_path: str | None = None, output_dir: str = "output"):
    print("=" * 60)
    print("  FMCG Deal Intelligence Pipeline")
    print("=" * 60)

    # ── Stage 1: Ingestion ────────────────────────────────────────────────────
    raw_articles = ingest(data_path)
    stage1_count = len(raw_articles)

    # ── Stage 2: De-duplication ───────────────────────────────────────────────
    deduped_articles = dedup(raw_articles)
    stage2_count = len(deduped_articles)

    # ── Stage 3: Relevance Filtering ──────────────────────────────────────────
    relevant_articles, irrelevant_articles = filter_relevance(deduped_articles)
    stage3_count = len(relevant_articles)

    # ── Stage 4: Credibility Check ────────────────────────────────────────────
    credible_articles, blocked_articles = check_credibility(relevant_articles)
    stage4_count = len(credible_articles)

    # Final sort by composite relevance score
    credible_articles.sort(key=lambda a: a.get("relevance_score", 0), reverse=True)

    # ── Pipeline log (for the Excel log sheet) ────────────────────────────────
    pipeline_log = [
        {
            "stage":  "1 – Ingestion",
            "input":  "Raw CSV / news feed",
            "output": stage1_count,
            "notes":  "Load articles from CSV; normalise field names and date formats.",
        },
        {
            "stage":  "2 – De-duplication",
            "input":  stage1_count,
            "output": stage2_count,
            "notes":  (
                f"Exact dedup via canonical title hash.  "
                f"Near-dedup via TF-IDF cosine similarity ≥ 0.55 (union-find clustering).  "
                f"Kept highest-credibility source per cluster.  "
                f"Removed {stage1_count - stage2_count} duplicates."
            ),
        },
        {
            "stage":  "3 – Relevance Filtering",
            "input":  stage2_count,
            "output": stage3_count,
            "notes":  (
                f"FMCG keyword score (0–40) + deal keyword score (0–40) + recency bonus (0–10).  "
                f"Threshold = 8 (FMCG + deal combined).  "
                f"Filtered {stage2_count - stage3_count} off-topic articles "
                f"(e.g. macro-economics, tech news, earnings reports)."
            ),
        },
        {
            "stage":  "4 – Credibility Check",
            "input":  stage3_count,
            "output": stage4_count,
            "notes":  (
                f"3-tier source whitelist: Tier-1 (Reuters/Bloomberg/FT/WSJ) = 9 pts, "
                f"Tier-2 (CNBC/BBC/Forbes) = 7 pts, Tier-3 (trade press) = 5 pts, "
                f"unknown = 3 pts, blocked = 0 pts.  "
                f"Hard-blocked {len(blocked_articles)} article(s) from unreliable sources."
            ),
        },
        {
            "stage":  "5 – Newsletter Generation",
            "input":  stage4_count,
            "output": f"{stage4_count} articles → 3 files",
            "notes":  "Excel workbook (4 sheets) + processed_articles.json + processed_articles.csv",
        },
    ]

    # ── Stage 5: Newsletter Generation ───────────────────────────────────────
    output_paths = newsletter.generate(credible_articles, pipeline_log, output_dir)

    print("=" * 60)
    print(f"  Pipeline complete.  {stage4_count} deal articles in newsletter.")
    print("=" * 60)
    print()
    print("  Output files:")
    for key, path in output_paths.items():
        print(f"    [{key.upper()}]  {path}")
    print()
    print("  Deal type breakdown:")
    type_counts: dict[str, int] = {}
    for a in credible_articles:
        dt = a.get("deal_type_detected", "Other")
        type_counts[dt] = type_counts.get(dt, 0) + 1
    for dt, cnt in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"    {cnt:3d}  {dt}")

    return credible_articles, output_paths


def main():
    parser = argparse.ArgumentParser(
        description="FMCG Deal Intelligence Newsletter Pipeline"
    )
    parser.add_argument(
        "--data", "-d",
        default=None,
        help="Path to input CSV or JSON file (default: data/raw_articles.csv)",
    )
    parser.add_argument(
        "--output", "-o",
        default="output",
        help="Output directory (default: output/)",
    )
    args = parser.parse_args()
    run_pipeline(data_path=args.data, output_dir=args.output)


if __name__ == "__main__":
    main()
