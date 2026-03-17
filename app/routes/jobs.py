"""
POST /api/jobs       – create and start a pipeline job
GET  /api/jobs/{id}  – poll job status
GET  /api/jobs/{id}/stream – SSE stream for real-time progress
"""

import asyncio
import json
import threading
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models import CreateJobRequest, JobStatus, JobState
from app import job_store
from pipeline.config import PipelineConfig
from pipeline.runner import run_pipeline

router = APIRouter()


@router.post("/jobs", response_model=JobStatus)
async def create_job(req: CreateJobRequest):
    file_path = job_store.get_file_path(req.file_id)
    if not file_path:
        raise HTTPException(404, f"File '{req.file_id}' not found. Please upload again.")

    config_dict = req.config.model_dump()
    job_id = job_store.create_job(req.file_id, config_dict)

    # Run pipeline in background thread (CPU-bound)
    def _run():
        try:
            job_store.set_job_running(job_id)
            config = PipelineConfig.from_dict(config_dict)
            output_dir = job_store.get_output_dir(job_id)

            def progress_cb(stage, inp, out, message):
                job_store.add_progress(job_id, stage, inp, out, message)

            result = run_pipeline(
                data_path=file_path,
                output_dir=output_dir,
                config=config,
                progress_cb=progress_cb,
            )
            job_store.set_job_complete(job_id, result["summary"], result["output_paths"])
        except Exception as e:
            job_store.set_job_error(job_id, str(e))

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return _job_to_status(job_store.get_job(job_id))


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    return _job_to_status(job)


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str):
    """Server-Sent Events stream for real-time pipeline progress."""
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")

    return StreamingResponse(
        _sse_generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _sse_generator(job_id: str) -> AsyncGenerator[str, None]:
    sent_count = 0
    while True:
        job = job_store.get_job(job_id)
        if not job:
            yield _sse("error", {"message": "Job not found"})
            return

        # Send any new progress events
        progress = job.get("progress", [])
        while sent_count < len(progress):
            yield _sse("progress", progress[sent_count])
            sent_count += 1

        state = job.get("state")

        if state == JobState.COMPLETE:
            yield _sse("complete", {
                "summary": job.get("summary"),
                "output_files": list(job.get("output_files", {}).keys()),
            })
            return

        if state == JobState.ERROR:
            yield _sse("error", {"message": job.get("error", "Unknown error")})
            return

        await asyncio.sleep(0.3)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _job_to_status(job: dict) -> JobStatus:
    return JobStatus(
        job_id=job["job_id"],
        state=job["state"],
        progress=[
            {"stage": p["stage"], "input": p["input"], "output": p["output"], "message": p["message"]}
            for p in job.get("progress", [])
        ],
        error=job.get("error"),
        summary=job.get("summary"),
        output_files=job.get("output_files"),
    )
