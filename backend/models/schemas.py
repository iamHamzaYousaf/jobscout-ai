"""Pydantic schemas for CV upload, job results, and search API responses."""

from pydantic import BaseModel, ConfigDict, Field


class CandidateProfile(BaseModel):
    """Structured candidate data extracted from a CV."""

    model_config = ConfigDict(from_attributes=True)

    skills: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    years_experience: int = 0
    location: str = ""
    raw_text: str = ""


class JobResult(BaseModel):
    """A single job listing with match score and LLM-generated reasoning."""

    model_config = ConfigDict(from_attributes=True)

    title: str
    company: str
    url: str
    description: str
    score: int
    reasoning: str
    source: str


class SearchResponse(BaseModel):
    """Response payload for the agentic job search endpoint."""

    model_config = ConfigDict(from_attributes=True)

    profile: CandidateProfile
    jobs: list[JobResult]
    total: int
    query_count: int
    status_messages: list[str] = Field(
        default_factory=list,
        description="Agent progress messages from LangGraph nodes.",
    )


class SearchRequest(BaseModel):
    """JSON body for initiating an agentic job search."""

    model_config = ConfigDict(from_attributes=True)

    profile: CandidateProfile


class CVUploadResponse(BaseModel):
    """Response after CV upload: extracted profile and ephemeral RAG session id."""

    model_config = ConfigDict(from_attributes=True)

    profile: CandidateProfile
    session_id: str
