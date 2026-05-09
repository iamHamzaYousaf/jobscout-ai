"""CV upload: parse PDF/DOCX, extract profile, chunk and embed for RAG."""

from __future__ import annotations

import logging
import traceback
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import CVUploadResponse, CandidateProfile
from services.cv_parser import extract_profile, parse_docx, parse_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


def _suffix(filename: str) -> str:
    """Return lowercase file extension without the dot."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _try_embed(raw_text: str, session_id: str) -> None:
    """Embed and store CV chunks; logs and continues on any failure."""
    try:
        from services.embedder import chunk_text, embed_and_store
        chunks = chunk_text(raw_text)
        embed_and_store(chunks, session_id)
    except Exception:
        logger.warning("Embedding step failed (non-fatal):\n%s", traceback.format_exc())


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(file: UploadFile = File(...)) -> CVUploadResponse:
    """
    Accept a CV file, parse text, extract a structured profile, and store embeddings.

    Returns a ``CandidateProfile`` and a ``session_id`` for follow-up searches.
    """
    filename = file.filename or ""
    ext = _suffix(filename)
    if ext not in ("pdf", "docx"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a .pdf or .docx file.",
        )

    raw_bytes = await file.read()

    try:
        if ext == "pdf":
            raw_text = parse_pdf(raw_bytes)
        else:
            raw_text = parse_docx(raw_bytes)
    except Exception as exc:
        logger.error("Failed to parse CV: %s", exc)
        raise HTTPException(status_code=422, detail=f"Could not read file: {exc}") from exc

    try:
        profile_dict = extract_profile(raw_text)
    except Exception as exc:
        logger.error("Profile extraction failed: %s", exc)
        profile_dict = {"skills": [], "roles": [], "years_experience": 0, "location": ""}

    session_id = str(uuid.uuid4())
    _try_embed(raw_text, session_id)

    profile = CandidateProfile(
        skills=profile_dict.get("skills") or [],
        roles=profile_dict.get("roles") or [],
        years_experience=int(profile_dict.get("years_experience") or 0),
        location=str(profile_dict.get("location") or ""),
        raw_text=raw_text,
    )

    return CVUploadResponse(profile=profile, session_id=session_id)
