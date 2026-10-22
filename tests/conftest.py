"""Shared fixtures: keep tests offline and side-effect free."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

SAMPLE_CSV = os.path.join(ROOT, "data", "raw_articles.csv")


@pytest.fixture(autouse=True)
def offline_and_isolated(monkeypatch, tmp_path):
    """Disable live HTTP link checks and redirect the raw-data side file to tmp."""
    import pipeline.ingestion as ingestion
    import pipeline.link_validator as link_validator

    monkeypatch.setattr(link_validator, "_REQUESTS_AVAILABLE", False)
    monkeypatch.setattr(ingestion, "_RAW_DATA_PATH", str(tmp_path / "raw_data.json"))
    yield
