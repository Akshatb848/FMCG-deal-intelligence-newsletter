"""
Stage 1 – Ingestion
Loads raw records from CSV or JSON and normalises them using a column mapping
from PipelineConfig. Works with any dataset structure.
"""

import csv
import json
import os
from datetime import datetime
from .config import PipelineConfig, DEFAULT_FMCG_CONFIG

# Path where raw ingested data is persisted for the /raw-data API endpoint
_RAW_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "raw_data.json"
)


def load_csv(path: str, config: PipelineConfig) -> list[dict]:
    articles = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            article = _normalise(row, config)
            if article:
                articles.append(article)
    return articles


def load_json(path: str, config: PipelineConfig) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    if isinstance(raw, dict):
        # Handle {data: [...]} or {articles: [...]} wrappers
        for key in ("data", "articles", "records", "items", "results"):
            if key in raw and isinstance(raw[key], list):
                raw = raw[key]
                break
        else:
            raw = list(raw.values())[0] if raw else []
    return [r for item in raw if (r := _normalise(item, config))]


def _normalise(raw: dict, config: PipelineConfig) -> dict | None:
    # Lowercase all keys for case-insensitive column matching
    record = {k.strip().lower(): str(v).strip() if v is not None else "" for k, v in raw.items()}

    # Map configured column names to standard pipeline names
    def get(col_name: str, fallback: str = "") -> str:
        # Try the configured column name (lowercased), then fallback to standard name
        val = record.get(col_name.lower(), "") or record.get(fallback.lower(), "")
        return val.strip()

    title    = get(config.col_title, "title")
    body     = (get(config.col_body, "summary") or get("description", "")
                or get("body", "") or get("content", "") or get("text", ""))
    source   = get(config.col_source, "source") or get("publisher", "") or get("outlet", "")
    date_str = get(config.col_date, "published_date") or get("date", "") or get("pub_date", "")
    url      = get(config.col_url, "url") or get("link", "") or get("href", "")
    category = get(config.col_category, "category") or get("type", "") or get("label", "")

    if not title or not source:
        return None

    # Normalise date
    parsed_date = _parse_date(date_str)

    # Generate stable id
    record_id = (
        get("id", "") or get("_id", "") or get("article_id", "")
        or str(abs(hash(title + source)))
    )

    normalised = {
        "id":             record_id,
        "title":          title,
        "summary":        body,
        "source":         source,
        "published_date": parsed_date,
        "url":            url,
        "category":       category,
        "full_text":      f"{title}. {body}",
    }
    return normalised


def _parse_date(date_str: str) -> str:
    if not date_str:
        return datetime.today().date().isoformat()
    formats = [
        "%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y",
        "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date().isoformat()
        except ValueError:
            continue
    return datetime.today().date().isoformat()


def ingest(
    data_path: str | None = None,
    config: PipelineConfig | None = None,
    progress_cb=None,
) -> list[dict]:
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    if data_path is None:
        data_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "raw_articles.csv",
        )

    ext = os.path.splitext(data_path)[-1].lower()
    if ext == ".json":
        articles = load_json(data_path, config)
    else:
        articles = load_csv(data_path, config)

    # Persist raw data for /raw-data API endpoint
    try:
        os.makedirs(os.path.dirname(_RAW_DATA_PATH), exist_ok=True)
        with open(_RAW_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, default=str)
    except Exception:
        pass  # Non-fatal

    msg = f"Loaded {len(articles)} records from '{os.path.basename(data_path)}'"
    print(f"[Ingestion] {msg}")
    if progress_cb:
        progress_cb("ingestion", len(articles), len(articles), msg)
    return articles
