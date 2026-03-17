"""
Pydantic models for the FastAPI application.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class JobState(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETE  = "complete"
    ERROR     = "error"


class PipelineConfigRequest(BaseModel):
    domain_name: str = Field("Deal Intelligence", description="Name shown in the report header")

    # Column mapping
    col_title:    str = Field("title",          description="CSV column for the record title/headline")
    col_body:     str = Field("summary",        description="CSV column for the body/content")
    col_source:   str = Field("source",         description="CSV column for the source/publisher")
    col_date:     str = Field("published_date", description="CSV column for the publication date")
    col_url:      str = Field("url",            description="CSV column for the URL (optional)")
    col_category: str = Field("category",       description="CSV column for the category (optional)")

    # Keywords
    primary_keywords:        list[str] = Field(default_factory=list)
    secondary_keywords:      list[str] = Field(default_factory=list)
    deal_primary_keywords:   list[str] = Field(default_factory=list)
    deal_secondary_keywords: list[str] = Field(default_factory=list)
    deal_type_labels:        dict[str, str] = Field(default_factory=dict)

    # Source credibility
    source_tier1: list[str] = Field(default_factory=list)
    source_tier2: list[str] = Field(default_factory=list)
    source_tier3: list[str] = Field(default_factory=list)
    blocklist:    list[str] = Field(default_factory=list)

    # Thresholds
    min_relevance_score: float = Field(8.0, ge=0, le=80)
    dedup_threshold:     float = Field(0.20, ge=0.05, le=0.95)


class CreateJobRequest(BaseModel):
    file_id: str
    config:  PipelineConfigRequest


class ProgressEvent(BaseModel):
    stage:   str
    input:   int
    output:  int
    message: str


class JobStatus(BaseModel):
    job_id:    str
    state:     JobState
    progress:  list[ProgressEvent] = Field(default_factory=list)
    error:     Optional[str] = None
    summary:   Optional[dict] = None
    output_files: Optional[dict] = None


class UploadResponse(BaseModel):
    file_id:  str
    filename: str
    columns:  list[str]
    row_count: int
    preview:  list[dict]
