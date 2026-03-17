"""
FastAPI application entry point.
Serves the static frontend and mounts all API routes.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routes.upload   import router as upload_router
from app.routes.jobs     import router as jobs_router
from app.routes.results  import router as results_router
from app.routes.pipeline import router as pipeline_router

app = FastAPI(
    title="FMCG Deal Intelligence Platform",
    description=(
        "End-to-end 7-stage AI pipeline: Ingestion → De-duplication → Relevance Filtering "
        "→ Credibility Scoring → Summarization → Newsletter Generation → Output Formatting."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(upload_router,   prefix="/api", tags=["Upload"])
app.include_router(jobs_router,     prefix="/api", tags=["Jobs"])
app.include_router(results_router,  prefix="/api", tags=["Results"])
app.include_router(pipeline_router, prefix="/api", tags=["Pipeline"])

# Static frontend
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_spa(path: str):
        # Serve index.html for any non-API path (SPA routing)
        full = os.path.join(STATIC_DIR, path)
        if os.path.isfile(full):
            return FileResponse(full)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
