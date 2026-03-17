"""
In-memory job store with thread-safe access.
Stores uploaded files and job state/results.
"""

import threading
import uuid
import os
import shutil
import tempfile
from datetime import datetime, timedelta
from .models import JobState, ProgressEvent

_lock = threading.Lock()

# job_id -> job dict
_jobs: dict[str, dict] = {}

# file_id -> file path on disk
_files: dict[str, str] = {}

UPLOAD_DIR = tempfile.mkdtemp(prefix="deal_intel_")
OUTPUT_BASE = os.path.join(tempfile.gettempdir(), "deal_intel_output")
os.makedirs(OUTPUT_BASE, exist_ok=True)


# ── Files ─────────────────────────────────────────────────────────────────────

def save_upload(filename: str, content: bytes) -> str:
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(filename)[-1].lower()
    dest = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    with open(dest, "wb") as f:
        f.write(content)
    with _lock:
        _files[file_id] = dest
    return file_id


def register_file(path: str) -> str:
    """Register an existing on-disk file and return a synthetic file_id."""
    file_id = str(uuid.uuid4())
    with _lock:
        _files[file_id] = path
    return file_id


def get_file_path(file_id: str) -> str | None:
    with _lock:
        return _files.get(file_id)


def all_jobs() -> list[dict]:
    """Return a snapshot list of all job dicts."""
    with _lock:
        return [dict(j) for j in _jobs.values()]


# ── Jobs ──────────────────────────────────────────────────────────────────────

def create_job(file_id: str, config_dict: dict) -> str:
    job_id = str(uuid.uuid4())
    output_dir = os.path.join(OUTPUT_BASE, job_id)
    os.makedirs(output_dir, exist_ok=True)
    with _lock:
        _jobs[job_id] = {
            "job_id":     job_id,
            "file_id":    file_id,
            "config":     config_dict,
            "state":      JobState.PENDING,
            "progress":   [],
            "error":      None,
            "summary":    None,
            "output_files": None,
            "output_dir": output_dir,
            "created_at": datetime.utcnow(),
        }
    return job_id


def get_job(job_id: str) -> dict | None:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def set_job_running(job_id: str):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["state"] = JobState.RUNNING


def add_progress(job_id: str, stage: str, inp: int, out: int, message: str):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["progress"].append({
                "stage": stage, "input": inp, "output": out, "message": message,
            })


def set_job_complete(
    job_id: str,
    summary: dict,
    output_files: dict,
    newsletter: dict | None = None,
):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["state"]        = JobState.COMPLETE
            _jobs[job_id]["summary"]      = summary
            _jobs[job_id]["output_files"] = output_files
            if newsletter is not None:
                _jobs[job_id]["newsletter"] = newsletter


def set_job_error(job_id: str, error: str):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["state"] = JobState.ERROR
            _jobs[job_id]["error"] = error


def get_output_dir(job_id: str) -> str | None:
    with _lock:
        job = _jobs.get(job_id)
        return job["output_dir"] if job else None


def get_articles(job_id: str) -> list[dict]:
    """Return stored articles for the job (from JSON output)."""
    import json
    job = get_job(job_id)
    if not job or not job.get("output_files"):
        return []
    json_path = job["output_files"].get("json")
    if not json_path or not os.path.exists(json_path):
        return []
    with open(json_path, encoding="utf-8") as f:
        return json.load(f)
