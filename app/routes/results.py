"""
GET /api/results/{job_id}/summary  – JSON summary + article list for dashboard
GET /api/results/{job_id}/download/{fmt}  – download json|csv|xlsx
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from app import job_store
from app.models import JobState

router = APIRouter()

MIME_TYPES = {
    "json": "application/json",
    "csv":  "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.get("/results/{job_id}/summary")
async def get_summary(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["state"] != JobState.COMPLETE:
        raise HTTPException(400, f"Job is not complete (state: {job['state']})")

    articles = job_store.get_articles(job_id)
    return JSONResponse({
        "summary":   job["summary"],
        "articles":  articles,
        "progress":  job.get("progress", []),
    })


@router.get("/results/{job_id}/download/{fmt}")
async def download_result(job_id: str, fmt: str):
    if fmt not in MIME_TYPES:
        raise HTTPException(400, f"Format must be one of: {', '.join(MIME_TYPES)}")

    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["state"] != JobState.COMPLETE:
        raise HTTPException(400, "Job is not complete yet")

    output_files = job.get("output_files") or {}
    file_path = output_files.get(fmt)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(404, f"Output file for format '{fmt}' not found")

    domain = (job.get("config") or {}).get("domain_name", "report")
    safe_domain = domain.replace(" ", "_").replace("/", "-")
    filename = f"{safe_domain}_{job_id[:8]}.{fmt}"

    return FileResponse(
        path=file_path,
        media_type=MIME_TYPES[fmt],
        filename=filename,
    )
