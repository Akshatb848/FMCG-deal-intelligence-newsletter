"""
Convenience pipeline endpoints used by the frontend and direct API consumers.

GET  /raw-data           – latest raw ingested data (data/raw_data.json)
GET  /processed-data     – processed articles from the latest completed job
GET  /newsletter         – structured newsletter from the latest completed job
POST /run-pipeline       – trigger a one-shot pipeline run with FMCG defaults
"""

import os
import json
import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, FileResponse

from app import job_store
from app.models import JobState
from pipeline.config import DEFAULT_FMCG_CONFIG
from pipeline.runner import run_pipeline

_DOWNLOAD_MIME = {
    "json": "application/json",
    "csv":  "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

router = APIRouter()

_RAW_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "raw_data.json",
)
_DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "raw_articles.csv",
)


def _latest_complete_job() -> dict | None:
    """Return the most-recently completed job dict, or None."""
    all_jobs = job_store.all_jobs()
    complete = [j for j in all_jobs if j.get("state") == JobState.COMPLETE]
    if not complete:
        return None
    return sorted(complete, key=lambda j: j.get("created_at", ""), reverse=True)[0]


# ── GET /raw-data ─────────────────────────────────────────────────────────────

@router.get("/raw-data")
async def get_raw_data():
    """Return the raw ingested articles (saved by the ingestion stage)."""
    if not os.path.exists(_RAW_DATA_PATH):
        raise HTTPException(
            404,
            "No raw data found. Run the pipeline at least once to generate /data/raw_data.json",
        )
    with open(_RAW_DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return JSONResponse({"count": len(data), "records": data})


# ── GET /processed-data ───────────────────────────────────────────────────────

@router.get("/processed-data")
async def get_processed_data():
    """Return processed articles (post-dedup, relevance-filtered, credibility-scored)."""
    job = _latest_complete_job()
    if not job:
        raise HTTPException(
            404,
            "No completed pipeline run found. POST /run-pipeline to generate data.",
        )
    articles = job_store.get_articles(job["job_id"])
    summary = job.get("summary", {})
    return JSONResponse({
        "count":    len(articles),
        "summary":  summary,
        "articles": articles,
    })


# ── GET /newsletter ───────────────────────────────────────────────────────────

@router.get("/newsletter")
async def get_newsletter():
    """Return the structured newsletter from the latest completed pipeline run."""
    job = _latest_complete_job()
    if not job:
        raise HTTPException(
            404,
            "No completed pipeline run found. POST /run-pipeline to generate data.",
        )
    newsletter = job.get("newsletter")
    if not newsletter:
        raise HTTPException(
            404,
            "Newsletter not found for this job. Re-run the pipeline to regenerate.",
        )
    return JSONResponse(newsletter)


# ── POST /run-pipeline ────────────────────────────────────────────────────────

@router.post("/run-pipeline")
async def run_pipeline_default():
    """
    Trigger a pipeline run using the default FMCG config and the built-in
    raw_articles.csv dataset. Returns immediately with a job_id; poll
    GET /jobs/{job_id} for status.
    """
    if not os.path.exists(_DEFAULT_DATA_PATH):
        raise HTTPException(
            404,
            f"Default dataset not found at '{_DEFAULT_DATA_PATH}'. "
            "Upload a file via POST /upload and use POST /jobs instead.",
        )

    config_dict = DEFAULT_FMCG_CONFIG.to_dict()

    # Register a synthetic file_id pointing at the default CSV
    file_id = job_store.register_file(_DEFAULT_DATA_PATH)
    job_id  = job_store.create_job(file_id, config_dict)

    def _run():
        try:
            job_store.set_job_running(job_id)
            output_dir = job_store.get_output_dir(job_id)

            def progress_cb(stage, inp, out, message):
                job_store.add_progress(job_id, stage, inp, out, message)

            result = run_pipeline(
                data_path=_DEFAULT_DATA_PATH,
                output_dir=output_dir,
                config=DEFAULT_FMCG_CONFIG,
                progress_cb=progress_cb,
            )
            job_store.set_job_complete(
                job_id,
                result["summary"],
                result["output_paths"],
                newsletter=result.get("newsletter"),
            )
        except Exception as e:
            job_store.set_job_error(job_id, str(e))

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return JSONResponse(
        {"job_id": job_id, "status": "running", "message": "Pipeline started. Poll GET /jobs/{job_id} for progress."},
        status_code=202,
    )


# ── GET /download/{fmt} ───────────────────────────────────────────────────────

@router.get("/download/{fmt}")
async def download_latest(fmt: str):
    """
    Download the latest completed pipeline output.
    fmt: json | csv | xlsx | docx
    No job_id required — serves from the most recent completed run.
    """
    if fmt not in _DOWNLOAD_MIME:
        raise HTTPException(400, f"Format must be one of: {', '.join(_DOWNLOAD_MIME)}")

    job = _latest_complete_job()
    if not job:
        raise HTTPException(
            404,
            "No completed pipeline run found. POST /run-pipeline first.",
        )

    output_files = job.get("output_files") or {}
    file_path = output_files.get(fmt)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(404, f"Output file for format '{fmt}' not found. Re-run the pipeline.")

    safe_name = "FMCG_Deal_Intelligence"
    filename = f"{safe_name}_Report.{fmt}"

    return FileResponse(
        path=file_path,
        media_type=_DOWNLOAD_MIME[fmt],
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
