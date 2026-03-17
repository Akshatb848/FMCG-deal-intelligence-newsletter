"""
POST /api/upload  – accept a CSV or JSON file, return column list + preview.
"""

import csv
import io
import json

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models import UploadResponse
from app import job_store

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "json"):
        raise HTTPException(400, "Only CSV and JSON files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50 MB)")

    file_id = job_store.save_upload(file.filename, content)

    # Parse to get columns and preview
    try:
        if ext == "json":
            columns, rows = _parse_json_meta(content)
        else:
            columns, rows = _parse_csv_meta(content)
    except Exception as e:
        raise HTTPException(422, f"Could not parse file: {e}")

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        columns=columns,
        row_count=len(rows),
        preview=rows[:5],
    )


def _parse_csv_meta(content: bytes) -> tuple[list[str], list[dict]]:
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = [dict(row) for row in reader]
    columns = list(reader.fieldnames or [])
    return columns, rows


def _parse_json_meta(content: bytes) -> tuple[list[str], list[dict]]:
    data = json.loads(content)
    if isinstance(data, dict):
        for key in ("data", "articles", "records", "items", "results"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break
        else:
            data = list(data.values())[0] if data else []
    if not data:
        return [], []
    columns = list(data[0].keys()) if data else []
    rows = [{str(k): str(v) for k, v in row.items()} for row in data]
    return columns, rows
