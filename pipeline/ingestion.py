"""
Stage 1 – Ingestion
Loads raw articles from a CSV file (or a list of dicts representing a live feed)
and returns a list of normalised article dicts.

In a production system this module would call live APIs (NewsAPI, Bloomberg,
Reuters Connect, etc.) or scrape RSS feeds.  Here we load the simulated dataset
that ships with the repo so the pipeline runs entirely offline.
"""

import csv
import json
import os
from datetime import datetime


# Fields we expect / require in every article record
REQUIRED_FIELDS = {"id", "title", "summary", "source", "published_date"}


def load_csv(path: str) -> list[dict]:
    """Load articles from a CSV file and return a list of normalised dicts."""
    articles = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            article = _normalise(row)
            if article:
                articles.append(article)
    return articles


def load_json(path: str) -> list[dict]:
    """Load articles from a JSON file (list of objects)."""
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    return [_normalise(item) for item in raw if _normalise(item)]


def _normalise(raw: dict) -> dict | None:
    """
    Validate and normalise a raw article record.
    Returns None for records missing critical fields.
    """
    # Lowercase all keys so the rest of the pipeline is case-insensitive
    record = {k.strip().lower(): str(v).strip() for k, v in raw.items()}

    # Silently drop records missing title or source (unusable)
    if not record.get("title") or not record.get("source"):
        return None

    # Parse date; fall back to today if format is unexpected
    date_str = record.get("published_date", "")
    try:
        record["published_date"] = datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
    except ValueError:
        record["published_date"] = datetime.today().date().isoformat()

    # Ensure a numeric id exists
    if "id" not in record:
        record["id"] = str(hash(record["title"]))

    # Concatenated text used downstream for similarity / scoring
    record["full_text"] = f"{record.get('title', '')}. {record.get('summary', '')}"

    return record


def ingest(data_path: str | None = None) -> list[dict]:
    """
    Public entry-point for Stage 1.
    Loads articles from the supplied path (CSV or JSON) or defaults to the
    bundled sample dataset.
    """
    if data_path is None:
        data_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data",
            "raw_articles.csv",
        )

    ext = os.path.splitext(data_path)[-1].lower()
    if ext == ".json":
        articles = load_json(data_path)
    else:
        articles = load_csv(data_path)

    print(f"[Ingestion] Loaded {len(articles)} raw articles from '{data_path}'")
    return articles
