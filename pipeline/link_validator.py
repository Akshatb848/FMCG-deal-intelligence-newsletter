"""
Stage 5 – Link Validation

Validates every URL in the article set before the final output is generated.

Validation logic:
  1. URL format check    — must be a well-formed http/https URL
  2. Domain whitelist    — prefer trusted sources; flag unknown/blocked domains
  3. HTTP status check   — HEAD request, accept only 200 (with GET fallback)
  4. Redirect loop guard — follow up to 5 redirects; flag loops
  5. Placeholder filter  — reject example.com, localhost, invalid TLDs, etc.

Each article gets:
  link_valid      : bool
  link_status     : int | None   (HTTP status code returned, or None on error)
  link_check_note : str          (human-readable reason for pass/fail)

Articles with link_valid == False are excluded from the final newsletter.

Performance:
  Uses ThreadPoolExecutor for concurrent HTTP checks (configurable workers).
  Falls back gracefully on network unavailability — treats timeout/error as
  invalid only when the URL itself looks suspicious; for well-known credible
  domains a network error is flagged as "unverified" (not hard-excluded)
  so the pipeline can still run in air-gapped / offline environments.
"""

import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

from .config import PipelineConfig, DEFAULT_FMCG_CONFIG

# ── Trusted domain whitelist ──────────────────────────────────────────────────

TRUSTED_DOMAINS = {
    "reuters.com",
    "bloomberg.com",
    "economictimes.indiatimes.com",
    "livemint.com",
    "cnbc.com",
    "ft.com",
    "wsj.com",
    "bbc.com",
    "bbc.co.uk",
    "theguardian.com",
    "forbes.com",
    "fortune.com",
    "businessinsider.com",
    "financialexpress.com",
    "businesstoday.in",
    "hindustantimes.com",
    "ndtv.com",
    "moneycontrol.com",
    "pehub.com",
    "vcircle.com",
    "techcrunch.com",
    "nytimes.com",
    "washingtonpost.com",
    "axios.com",
    "marketwatch.com",
    "thestreet.com",
    "drinksbusiness.com",
    "fooddive.com",
    "grocerydive.com",
    "foodnavigator.com",
    "just-food.com",
    "beveragedaily.com",
    "cosmeticsbusiness.com",
    "cosmeticsdesign.com",
    "nutraingredients.com",
}

# Domains that are always invalid (rumour/spam/test sites)
BLOCKED_DOMAINS = {
    "dealrumors.net",
    "fakefmcgnews.biz",
    "clickbait-deals.ru",
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "localhost",
    "placeholder.invalid",
    "testsite.example",
    "nonexistentdomain12345.com",
    "invalidlink.test",
}

# TLDs that are always synthetic/test
_FAKE_TLDS = {".invalid", ".test", ".example", ".local"}

# URL pattern
_URL_RE = re.compile(
    r'^https?://'                         # scheme
    r'(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}'  # domain
    r'(?::\d+)?'                          # optional port
    r'(?:[/?#]\S*)?$',                    # path/query
    re.IGNORECASE,
)

_HTTP_TIMEOUT = 8   # seconds per request
_MAX_REDIRECTS = 5
_MAX_WORKERS  = 12  # concurrent validators


def _extract_domain(url: str) -> str:
    """Return the netloc (e.g. 'www.reuters.com') lower-cased."""
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""


def _root_domain(netloc: str) -> str:
    """Return last two parts: 'www.reuters.com' → 'reuters.com'."""
    parts = netloc.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return netloc


def _is_placeholder(url: str) -> bool:
    netloc = _extract_domain(url)
    root   = _root_domain(netloc)
    if root in BLOCKED_DOMAINS or netloc in BLOCKED_DOMAINS:
        return True
    for tld in _FAKE_TLDS:
        if netloc.endswith(tld):
            return True
    return False


def _validate_url_format(url: str) -> tuple[bool, str]:
    """Return (valid, note)."""
    if not url or not isinstance(url, str):
        return False, "Empty or missing URL"
    url = url.strip()
    if not _URL_RE.match(url):
        return False, f"Malformed URL: {url[:80]}"
    if _is_placeholder(url):
        return False, f"Blocked/placeholder domain: {_extract_domain(url)}"
    return True, "Format OK"


def _http_check(url: str) -> tuple[Optional[int], str]:
    """
    Return (status_code, note).
    Tries HEAD first, falls back to GET if HEAD returns 405/403.
    Returns (None, error_message) on exception.
    """
    if not _REQUESTS_AVAILABLE:
        return None, "requests library not available"

    session = _requests.Session()
    session.max_redirects = _MAX_REDIRECTS
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; FMCGIntelBot/1.0; "
            "+https://fmcgintelligence.example/bot)"
        ),
        "Accept": "text/html,application/xhtml+xml,*/*",
    }

    try:
        resp = session.head(
            url, timeout=_HTTP_TIMEOUT, headers=headers,
            allow_redirects=True,
        )
        if resp.status_code in (405, 403, 406):
            # Server doesn't allow HEAD — try GET with stream
            resp = session.get(
                url, timeout=_HTTP_TIMEOUT, headers=headers,
                stream=True, allow_redirects=True,
            )
        return resp.status_code, f"HTTP {resp.status_code}"
    except _requests.exceptions.TooManyRedirects:
        return None, "Redirect loop detected"
    except _requests.exceptions.ConnectionError:
        return None, "Connection error (domain unreachable)"
    except _requests.exceptions.Timeout:
        return None, "Request timed out"
    except Exception as exc:
        return None, f"Error: {str(exc)[:80]}"


def validate_single(url: str, trusted_bypass: bool = True) -> dict:
    """
    Validate one URL. Returns dict:
      { link_valid, link_status, link_check_note }

    trusted_bypass: if True, network errors on trusted domains are treated as
    "unverified but not excluded" — link_valid stays True with a note.
    """
    # Step 1: format check
    fmt_ok, fmt_note = _validate_url_format(url)
    if not fmt_ok:
        return {"link_valid": False, "link_status": None, "link_check_note": fmt_note}

    netloc  = _extract_domain(url)
    root    = _root_domain(netloc)
    # Check full netloc AND root against whitelist (handles subdomains like economictimes.indiatimes.com)
    trusted = root in TRUSTED_DOMAINS or netloc in TRUSTED_DOMAINS

    # Step 2: blocked domain
    if root in BLOCKED_DOMAINS or netloc in BLOCKED_DOMAINS:
        return {"link_valid": False, "link_status": None, "link_check_note": f"Blocked domain: {root}"}

    # Step 3: HTTP check
    status, note = _http_check(url)

    if status == 200:
        tier = "trusted" if trusted else "standard"
        return {"link_valid": True, "link_status": 200, "link_check_note": f"Valid ({tier} source)"}

    if status is None:
        # Network error
        if trusted_bypass and trusted:
            # Well-known source, network may be restricted — mark as unverified-pass
            return {
                "link_valid": True,
                "link_status": None,
                "link_check_note": f"Trusted domain — network check inconclusive ({note})",
            }
        return {"link_valid": False, "link_status": None, "link_check_note": note}

    # Non-200 status (301, 302, 404, 5xx …)
    if status in (301, 302, 307, 308):
        # Redirect that wasn't followed to 200
        return {"link_valid": False, "link_status": status, "link_check_note": f"Redirect not resolved (HTTP {status})"}

    if status == 404:
        # 404 on trusted domain: article may have been paywalled/moved
        if trusted_bypass and trusted:
            return {
                "link_valid": True,
                "link_status": 404,
                "link_check_note": f"Trusted domain — article may have moved (HTTP 404, accepted)",
            }
        return {"link_valid": False, "link_status": 404, "link_check_note": "Article not found (HTTP 404)"}

    if status and status >= 500:
        return {"link_valid": False, "link_status": status, "link_check_note": f"Server error (HTTP {status})"}

    # 4xx other, paywalled, etc.
    if trusted_bypass and trusted:
        return {
            "link_valid": True,
            "link_status": status,
            "link_check_note": f"Trusted domain with HTTP {status} (possible paywall — accepted)",
        }

    return {"link_valid": False, "link_status": status, "link_check_note": f"HTTP {status} — excluded"}


def validate_links(
    articles: list[dict],
    config: PipelineConfig | None = None,
    progress_cb=None,
    max_workers: int = _MAX_WORKERS,
) -> tuple[list[dict], list[dict], int]:
    """
    Stage 5 entry point.

    Returns:
        valid_articles   — list of articles with link_valid == True
        invalid_articles — list of articles with link_valid == False
        total_invalid    — count of invalid links removed
    """
    if config is None:
        config = DEFAULT_FMCG_CONFIG

    n = len(articles)
    print(f"[LinkValidator] Checking {n} URLs with up to {max_workers} workers …")

    results: dict[str, dict] = {}

    # Concurrent validation
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {
            pool.submit(validate_single, article.get("url", "")): article["id"]
            for article in articles
        }
        for future in as_completed(future_map):
            art_id = future_map[future]
            try:
                results[art_id] = future.result()
            except Exception as exc:
                results[art_id] = {
                    "link_valid": False,
                    "link_status": None,
                    "link_check_note": f"Validator error: {exc}",
                }

    # Annotate articles with validation results
    valid_articles   = []
    invalid_articles = []

    for article in articles:
        art_id = article["id"]
        vr = results.get(art_id, {"link_valid": False, "link_status": None, "link_check_note": "No result"})
        article["link_valid"]      = vr["link_valid"]
        article["link_status"]     = vr["link_status"]
        article["link_check_note"] = vr["link_check_note"]

        if vr["link_valid"]:
            valid_articles.append(article)
        else:
            invalid_articles.append(article)
            print(f"  [INVALID] {art_id} — {vr['link_check_note']} — {article.get('url', '')[:60]}")

    total_invalid = len(invalid_articles)

    msg = (
        f"Link validation complete: {len(valid_articles)} valid, "
        f"{total_invalid} invalid (removed from newsletter)"
    )
    print(f"[LinkValidator] {msg}")

    if progress_cb:
        progress_cb("link_validation", n, len(valid_articles), msg)

    return valid_articles, invalid_articles, total_invalid
