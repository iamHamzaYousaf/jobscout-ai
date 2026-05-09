"""Agentic job search API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from models.schemas import JobResult, SearchRequest, SearchResponse
from services.agent import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search_jobs_endpoint(body: SearchRequest) -> SearchResponse:
    """
    Run the LangGraph agent on the given profile and return ranked jobs with reasoning.
    """
    profile = body.profile
    try:
        final_state = run_agent(profile.model_dump())
    except Exception as exc:
        logger.error("Agent run failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {type(exc).__name__}: {exc}",
        ) from exc

    evaluated = final_state.get("evaluated_jobs") or []
    queries = final_state.get("queries") or []

    jobs: list[JobResult] = []
    for item in evaluated:
        jobs.append(
            JobResult(
                title=str(item.get("title") or ""),
                company=str(item.get("company") or ""),
                url=str(item.get("url") or ""),
                description=str(item.get("content") or item.get("description") or ""),
                score=int(item.get("score") or 0),
                reasoning=str(item.get("reasoning") or ""),
                source=str(item.get("source") or "tavily"),
            )
        )

    return SearchResponse(
        profile=profile,
        jobs=jobs,
        total=len(jobs),
        query_count=len(queries),
        status_messages=list(final_state.get("status_messages") or []),
    )
