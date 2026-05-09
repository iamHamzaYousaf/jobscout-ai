"""CV text extraction and LLM-based structured profile extraction."""

from __future__ import annotations

import json
import os
import re
from io import BytesIO

import fitz  # PyMuPDF
from docx import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq


def parse_pdf(file_bytes: bytes) -> str:
    """Extract all plain text from a PDF using PyMuPDF."""
    text_parts: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text() or "")
    return "\n".join(text_parts).strip()


def parse_docx(file_bytes: bytes) -> str:
    """Extract paragraph text from a Word document, joined by newlines."""
    document = Document(BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs if p.text).strip()


_SYSTEM_PROMPT = (
    "You are a CV analysis expert. Extract structured data from the CV text provided. "
    "Return ONLY valid JSON with these exact keys: skills (array of strings, max 10), "
    "roles (array of job titles held, max 5), years_experience (integer), "
    "location (string, city or country). No explanation, no markdown, only JSON."
)


def _strip_json_fence(text: str) -> str:
    """Remove optional ```json ... ``` wrapping from model output."""
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def extract_profile(raw_text: str) -> dict:
    """
    Call Groq (Llama 3) to extract skills, roles, experience, and location as JSON.

    On parse failure, returns a safe default structure with empty values.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "skills": [],
            "roles": [],
            "years_experience": 0,
            "location": "",
        }

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        temperature=0,
    )
    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=raw_text[:12000]),
    ]
    response = llm.invoke(messages)
    content = getattr(response, "content", str(response)) or ""

    try:
        payload = json.loads(_strip_json_fence(content))
    except (json.JSONDecodeError, TypeError):
        return {
            "skills": [],
            "roles": [],
            "years_experience": 0,
            "location": "",
        }

    return {
        "skills": list(payload.get("skills") or [])[:10],
        "roles": list(payload.get("roles") or [])[:5],
        "years_experience": int(payload.get("years_experience") or 0),
        "location": str(payload.get("location") or ""),
    }
