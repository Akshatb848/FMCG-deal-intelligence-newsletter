"""
Pipeline runner — wraps all seven stages with progress callbacks.
Used by both the web API (async jobs) and the CLI.

Stage 1  – Ingestion
Stage 2  – De-duplication
Stage 3  – Relevance Filtering
Stage 4  – Credibility Check
Stage 5  – Summarization
Stage 6  – Newsletter Text Generation
Stage 7  – Output Formatting (JSON / CSV / Excel)
"""

from .config           import PipelineConfig, DEFAULT_FMCG_CONFIG
from .ingestion        import ingest
from .dedup            import dedup
from .relevance        import filter_relevance
from .credibility      import check_credibility
from .summarization    import summarize
from .newsletter_text  import generate_newsletter
from .newsletter       import generate as generate_outputs


def run_pipeline(
    data_path: str,
    output_dir: str,
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> dict:
    """
    Execute the full 7-stage pipeline.

    progress_cb(stage, input_count, output_count, message) is called after
    each stage so callers can stream progress to the UI.

    Returns a dict with keys:
        articles, output_paths, pipeline_log, summary, newsletter
    """
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    # ── Stage 1: Ingestion ────────────────────────────────────────────────────
    raw = ingest(data_path, config, progress_cb)
    s1 = len(raw)

    # ── Stage 2: De-duplication ───────────────────────────────────────────────
    deduped = dedup(raw, config, progress_cb)
    s2 = len(deduped)

    # ── Stage 3: Relevance Filtering ──────────────────────────────────────────
    relevant, dropped = filter_relevance(deduped, config, progress_cb)
    s3 = len(relevant)

    # ── Stage 4: Credibility Check ────────────────────────────────────────────
    credible, blocked = check_credibility(relevant, config, progress_cb)
    s4 = len(credible)

    credible.sort(key=lambda a: a.get("relevance_score", 0), reverse=True)

    # ── Stage 5: Summarization ────────────────────────────────────────────────
    summarized = summarize(credible, config, progress_cb)

    # ── Pipeline log (built before stage 6 so it can be embedded in newsletter) ──
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
                f"Domain keyword score + deal keyword score "
                f"(threshold={config.min_relevance_score}). "
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
            "stage":  "5 – Summarization",
            "input":  s4,
            "output": s4,
            "notes":  (
                "Extractive summarization: 2-line summaries per article. "
                "Extracted company names and deal values."
            ),
        },
        {
            "stage":  "6 – Newsletter Generation",
            "input":  s4,
            "output": "1 newsletter",
            "notes":  "Structured newsletter: header + key highlights + all deals + insights.",
        },
        {
            "stage":  "7 – Output Formatting",
            "input":  s4,
            "output": f"{s4} records → 4 files",
            "notes":  "Excel workbook (4 sheets) + JSON + CSV + Word (.docx) newsletter.",
        },
    ]

    # ── Stage 6: Newsletter Text Generation ───────────────────────────────────
    newsletter = generate_newsletter(summarized, pipeline_log, config, progress_cb)

    # ── Stage 7: Generate file outputs ────────────────────────────────────────
    output_paths = generate_outputs(summarized, pipeline_log, output_dir, config, progress_cb)

    # ── Deal type breakdown ───────────────────────────────────────────────────
    type_counts: dict[str, int] = {}
    for a in summarized:
        dt = a.get("deal_type_detected", "Other")
        type_counts[dt] = type_counts.get(dt, 0) + 1

    summary = {
        "total_input":     s1,
        "after_dedup":     s2,
        "after_relevance": s3,
        "final_count":     s4,
        "blocked":         len(blocked),
        "dropped":         s2 - s3,
        "type_breakdown":  type_counts,
        "domain_name":     config.domain_name,
    }

    return {
        "articles":     summarized,
        "output_paths": output_paths,
        "pipeline_log": pipeline_log,
        "summary":      summary,
        "newsletter":   newsletter,
    }
