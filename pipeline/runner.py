"""
Pipeline runner — wraps all five stages with progress callbacks.
Used by both the web API (async jobs) and the CLI.
"""

from .config import PipelineConfig, DEFAULT_FMCG_CONFIG
from .ingestion   import ingest
from .dedup       import dedup
from .relevance   import filter_relevance
from .credibility import check_credibility
from .newsletter  import generate


def run_pipeline(
    data_path: str,
    output_dir: str,
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> dict:
    """
    Execute the full pipeline.

    progress_cb(stage, input_count, output_count, message) is called after
    each stage so callers can stream progress to the UI.

    Returns a dict with keys: articles, output_paths, pipeline_log, summary.
    """
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    # Stage 1: Ingestion
    raw = ingest(data_path, config, progress_cb)
    s1 = len(raw)

    # Stage 2: De-duplication
    deduped = dedup(raw, config, progress_cb)
    s2 = len(deduped)

    # Stage 3: Relevance filtering
    relevant, dropped = filter_relevance(deduped, config, progress_cb)
    s3 = len(relevant)

    # Stage 4: Credibility check
    credible, blocked = check_credibility(relevant, config, progress_cb)
    s4 = len(credible)

    credible.sort(key=lambda a: a.get("relevance_score", 0), reverse=True)

    # Pipeline log
    pipeline_log = [
        {
            "stage":  "1 – Ingestion",
            "input":  "Raw file",
            "output": s1,
            "notes":  f"Loaded {s1} records; normalised field names and dates.",
        },
        {
            "stage":  "2 – De-duplication",
            "input":  s1,
            "output": s2,
            "notes":  (
                f"Exact dedup via title hash + near-dedup via TF-IDF cosine "
                f"(threshold={config.dedup_threshold}). Removed {s1 - s2} duplicates."
            ),
        },
        {
            "stage":  "3 – Relevance Filtering",
            "input":  s2,
            "output": s3,
            "notes":  (
                f"Domain keyword score + deal keyword score (threshold={config.min_relevance_score}). "
                f"Filtered {s2 - s3} off-topic records."
            ),
        },
        {
            "stage":  "4 – Credibility Check",
            "input":  s3,
            "output": s4,
            "notes":  (
                f"3-tier source whitelist. "
                f"Hard-blocked {len(blocked)} record(s) from unreliable sources."
            ),
        },
        {
            "stage":  "5 – Report Generation",
            "input":  s4,
            "output": f"{s4} records → 3 files",
            "notes":  "Excel workbook (4 sheets) + JSON + CSV.",
        },
    ]

    # Stage 5: Generate outputs
    output_paths = generate(credible, pipeline_log, output_dir, config, progress_cb)

    # Deal type breakdown
    type_counts: dict[str, int] = {}
    for a in credible:
        dt = a.get("deal_type_detected", "Other")
        type_counts[dt] = type_counts.get(dt, 0) + 1

    summary = {
        "total_input":   s1,
        "after_dedup":   s2,
        "after_relevance": s3,
        "final_count":   s4,
        "blocked":       len(blocked),
        "dropped":       s2 - s3,
        "type_breakdown": type_counts,
        "domain_name":   config.domain_name,
    }

    return {
        "articles":     credible,
        "output_paths": output_paths,
        "pipeline_log": pipeline_log,
        "summary":      summary,
    }
