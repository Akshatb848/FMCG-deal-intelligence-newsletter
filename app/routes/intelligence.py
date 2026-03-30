"""
AI Intelligence endpoints — backed by Supabase.

These endpoints power the new real-time intelligence layer alongside the
existing file-upload/CSV pipeline. They read from and write to Supabase
tables populated by the n8n automation workflows.

Endpoints:
  GET  /api/intel/feed          - Paginated published articles from Supabase
  GET  /api/intel/trends        - Latest trend snapshot + company activity
  GET  /api/intel/companies     - Company knowledge graph
  POST /api/intel/extract       - On-demand AI extraction for a single URL
  POST /api/intel/newsletter    - On-demand newsletter generation
  GET  /api/intel/health        - Supabase connectivity check
"""

from __future__ import annotations

import os
import json
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intel", tags=["intelligence"])

# ── Supabase config ────────────────────────────────────────────────────────────

SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ANTHROPIC_API_KEY    = os.getenv("ANTHROPIC_API_KEY", "")

_SB_HEADERS = {
    "apikey":         SUPABASE_SERVICE_KEY,
    "Authorization":  f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":   "application/json",
}

_HTTP_TIMEOUT = 20.0  # seconds


def _sb_url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1{path}"


def _configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


async def _sb_get(path: str, params: dict | None = None) -> Any:
    """Perform a Supabase REST GET and return parsed JSON."""
    if not _configured():
        raise HTTPException(503, "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)")
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(_sb_url(path), headers=_SB_HEADERS, params=params)
        resp.raise_for_status()
        return resp.json()


async def _sb_post(path: str, body: Any, params: dict | None = None) -> Any:
    """Perform a Supabase REST POST and return parsed JSON."""
    if not _configured():
        raise HTTPException(503, "Supabase not configured")
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            _sb_url(path), headers={**_SB_HEADERS, "Prefer": "return=representation"},
            json=body, params=params,
        )
        resp.raise_for_status()
        return resp.json()


# ── Request / Response models ─────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    url:     HttpUrl
    title:   str | None = None
    content: str | None = None  # pre-fetched content; if empty, will be fetched


class NewsletterRequest(BaseModel):
    max_articles:     int  = 15
    force_regenerate: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
async def intel_health():
    """Check Supabase connectivity."""
    if not _configured():
        return JSONResponse({"status": "unconfigured", "supabase": False})
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/news_processed",
                headers=_SB_HEADERS,
                params={"limit": "1", "select": "id"},
            )
            resp.raise_for_status()
        return {"status": "ok", "supabase": True}
    except Exception as exc:
        return JSONResponse({"status": "error", "supabase": False, "detail": str(exc)}, status_code=503)


@router.get("/feed")
async def intel_feed(
    page:      int   = Query(1,    ge=1),
    limit:     int   = Query(20,   ge=1,  le=100),
    category:  str | None = Query(None),
    deal_type: str | None = Query(None),
    trending:  bool | None = Query(None),
    sort:      str   = Query("latest"),
):
    """Return paginated published articles from Supabase v_news_feed view."""
    offset = (page - 1) * limit

    params: dict[str, str] = {
        "order":  "created_at.desc",
        "limit":  str(limit),
        "offset": str(offset),
    }
    if category:  params["category"]  = f"eq.{category}"
    if deal_type: params["deal_type"] = f"eq.{deal_type}"
    if trending:  params["trending_flag"] = "eq.true"

    if sort == "trending":
        params["order"] = "trending_flag.desc,trend_score.desc,created_at.desc"
    elif sort == "confidence":
        params["order"] = "confidence_score.desc,created_at.desc"

    try:
        articles = await _sb_get("/v_news_feed", params)
        return {
            "articles":   articles,
            "page":       page,
            "limit":      limit,
            "count":      len(articles),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("intel_feed error: %s", exc)
        raise HTTPException(500, str(exc))


@router.get("/trends")
async def intel_trends(window_hours: int = Query(24)):
    """Return latest trend snapshot and company activity."""
    valid_window = window_hours if window_hours in (24, 48, 168) else 24
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=valid_window)).isoformat()

    try:
        snapshot_data, company_data, trending_data = await _sb_get(
            "/trend_snapshots",
            {"order": "created_at.desc", "limit": "1", "window_hours": f"eq.{valid_window}"},
        ), await _sb_get(
            "/v_company_activity",
            {"order": "total_mentions.desc", "limit": "15"},
        ), await _sb_get(
            "/v_news_feed",
            {"trending_flag": "eq.true", "order": "trend_score.desc", "limit": "10"},
        )
        return {
            "snapshot":          snapshot_data[0] if snapshot_data else None,
            "companies":         company_data,
            "trending_articles": trending_data,
            "window_hours":      valid_window,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("intel_trends error: %s", exc)
        raise HTTPException(500, str(exc))


@router.get("/companies")
async def intel_companies(
    company: str | None = Query(None),
    limit:   int = Query(20, ge=1, le=50),
):
    """Return company intelligence layer."""
    params: dict[str, str] = {
        "order": "total_mentions.desc",
        "limit": str(limit),
    }
    if company:
        params["company_name"] = f"ilike.*{company}*"

    try:
        companies = await _sb_get("/v_company_activity", params)

        # Knowledge graph: co-mentioned companies
        recent_articles = await _sb_get(
            "/news_processed",
            {
                "published":  "eq.true",
                "deal_type":  "neq.none",
                "select":     "companies,deal_type",
                "order":      "created_at.desc",
                "limit":      "30",
            },
        )

        edges: dict[str, set] = {}
        for art in recent_articles:
            cos: list[str] = art.get("companies", [])
            if isinstance(cos, str):
                try:
                    cos = json.loads(cos)
                except Exception:
                    cos = []
            for i, co1 in enumerate(cos):
                for co2 in cos[i + 1:]:
                    edges.setdefault(co1, set()).add(co2)
                    edges.setdefault(co2, set()).add(co1)

        graph = sorted(
            [{"company": c, "connected_to": list(v)[:10], "degree": len(v)} for c, v in edges.items()],
            key=lambda x: x["degree"],
            reverse=True,
        )[:30]

        return {"companies": companies, "knowledge_graph": graph}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("intel_companies error: %s", exc)
        raise HTTPException(500, str(exc))


@router.post("/extract")
async def intel_extract(req: ExtractRequest):
    """
    On-demand AI extraction for a single article URL.
    Fetches the page, calls Claude, and stores the result in Supabase.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "ANTHROPIC_API_KEY not configured")

    url_str = str(req.url)
    content = req.content or ""
    title   = req.title or ""

    # Fetch content if not provided
    if not content:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                page = await client.get(url_str, headers={"User-Agent": "Mozilla/5.0"})
                content = page.text[:4000]  # truncate for prompt
        except Exception as exc:
            logger.warning("Content fetch failed for %s: %s", url_str, exc)

    # Generate content hash for dedup
    content_hash = hashlib.md5(url_str.encode()).hexdigest()

    # Check if already processed
    existing = await _sb_get("/news_raw", {"content_hash": f"eq.{content_hash}", "select": "id,is_processed"})
    if existing and existing[0].get("is_processed"):
        return {"status": "already_processed", "raw_id": existing[0]["id"]}

    # Upsert into news_raw
    raw_row = {
        "title":            title or url_str,
        "url":              url_str,
        "content":          content[:2000],
        "source":           _extract_domain(url_str),
        "published_at":     datetime.now(timezone.utc).isoformat(),
        "content_hash":     content_hash,
        "ingestion_source": "api",
        "is_relevant":      True,
    }
    try:
        saved_raw = await _sb_post("/news_raw", raw_row, {"on_conflict": "content_hash"})
        raw_id = saved_raw[0]["id"] if saved_raw else None
    except Exception as exc:
        logger.error("Failed to upsert news_raw: %s", exc)
        raise HTTPException(500, f"DB write failed: {exc}")

    # Call Claude for extraction
    extraction = await _call_claude_extraction(title, content, url_str, _extract_domain(url_str))

    if extraction and raw_id:
        processed_row = {
            "raw_id":           raw_id,
            "headline":         extraction.get("headline", title)[:255],
            "summary":          extraction.get("summary"),
            "category":         extraction.get("category", "Other"),
            "companies":        json.dumps(extraction.get("companies", [])),
            "deal_type":        extraction.get("deal_type", "none"),
            "geography":        extraction.get("geography"),
            "deal_value":       extraction.get("deal_value"),
            "key_insights":     json.dumps(extraction.get("key_insights", [])),
            "confidence_score": extraction.get("confidence_score", 0.5),
            "source":           _extract_domain(url_str),
            "original_url":     url_str,
            "published":        True,
            "published_at":     datetime.now(timezone.utc).isoformat(),
        }
        try:
            saved_proc = await _sb_post("/news_processed", processed_row)
            # Mark raw as processed
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.patch(
                    _sb_url(f"/news_raw?id=eq.{raw_id}"),
                    headers=_SB_HEADERS,
                    json={"is_processed": True},
                )
            return {"status": "extracted", "article": saved_proc[0] if saved_proc else None}
        except Exception as exc:
            logger.error("Failed to save extraction: %s", exc)

    return {"status": "extraction_failed", "raw": extraction}


@router.post("/newsletter")
async def intel_newsletter(req: NewsletterRequest):
    """On-demand newsletter generation via Claude."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "ANTHROPIC_API_KEY not configured")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if not req.force_regenerate:
        existing = await _sb_get(
            "/newsletters",
            {"published_at": f"gte.{today}T00:00:00Z", "select": "id,title,published_at", "limit": "1"},
        )
        if existing:
            return {"newsletter": existing[0], "cached": True}

    articles = await _sb_get(
        "/v_news_feed",
        {
            "order": "trending_flag.desc,trend_score.desc,confidence_score.desc",
            "limit": str(req.max_articles),
        },
    )

    if not articles:
        raise HTTPException(422, "No published articles available")

    date_str = datetime.now().strftime("%B %d, %Y")
    content_text = await _call_claude_newsletter(articles, date_str)

    if not content_text:
        raise HTTPException(502, "Newsletter generation failed")

    stats = {
        "total_articles": len(articles),
        "deals":          sum(1 for a in articles if a.get("category") == "Deals"),
        "trending":       sum(1 for a in articles if a.get("trending_flag")),
    }

    saved = await _sb_post("/newsletters", {
        "title":        f"FMCG Deal Intelligence — {date_str}",
        "date_range":   date_str,
        "edition":      "Daily",
        "content_text": content_text,
        "article_ids":  json.dumps([a["id"] for a in articles]),
        "highlights":   json.dumps([
            {"headline": a["title"], "summary": a.get("summary"), "url": a.get("url")}
            for a in articles[:3]
        ]),
        "stats": json.dumps(stats),
    })

    return {"newsletter": saved[0] if saved else {"content_text": content_text}, "saved": bool(saved)}


# ── Private helpers ───────────────────────────────────────────────────────────

def _extract_domain(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname.replace("www.", "") if urlparse(url).hostname else "unknown"
    except Exception:
        return "unknown"


async def _call_claude_extraction(title: str, content: str, url: str, source: str) -> dict | None:
    system = (
        "You are an FMCG deal intelligence analyst. "
        "Extract structured JSON from news articles. No hallucination. "
        "Return ONLY valid JSON."
    )
    user = (
        f"Source: {source}\nURL: {url}\nTitle: {title}\n"
        f"Content: {content[:2000]}\n\n"
        "Return JSON:\n"
        '{"headline":"...","summary":"...","category":"Deals|Trends|Product Launch|Regulatory|Other",'
        '"companies":[],"deal_type":"acquisition|merger|partnership|expansion|divestiture|investment|joint_venture|ipo|none",'
        '"geography":"...","deal_value":null,"key_insights":[],"confidence_score":0.0}'
    )
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      "claude-sonnet-4-6",
                    "max_tokens": 1024,
                    "system":     system,
                    "messages":   [{"role": "user", "content": user}],
                },
            )
            resp.raise_for_status()
            text = resp.json()["content"][0]["text"]
            cleaned = text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
    except Exception as exc:
        logger.error("Claude extraction error: %s", exc)
        return None


async def _call_claude_newsletter(articles: list, date_str: str) -> str | None:
    articles_short = [
        {
            "headline":  a.get("title", ""),
            "summary":   a.get("summary", ""),
            "category":  a.get("category", ""),
            "deal_type": a.get("deal_type", ""),
            "companies": a.get("companies", []),
            "geography": a.get("geography", ""),
        }
        for a in articles[:15]
    ]
    prompt = (
        f"Write the FMCG Deal Intelligence Daily Brief for {date_str}. "
        "Be concise, analytical, and specific. Use real company names and numbers.\n\n"
        f"ARTICLES:\n{json.dumps(articles_short, indent=2)}\n\n"
        "Include: Executive Summary (2 sentences), Top 3 Highlights, Trend Watch (1 paragraph), "
        "Company Moves (bullet points), Today's Numbers."
    )
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      "claude-sonnet-4-6",
                    "max_tokens": 2048,
                    "messages":   [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
    except Exception as exc:
        logger.error("Claude newsletter error: %s", exc)
        return None
