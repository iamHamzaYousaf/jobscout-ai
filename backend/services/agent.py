"""LangGraph agent: plan queries, search jobs, evaluate matches, rank results."""

from __future__ import annotations

import json
import os
import re
import time
from typing import TypedDict

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

from services.job_search import search_jobs

# Free-tier TPM limits (tokens per minute):
#   llama-3.3-70b-versatile : 12 000  → used for planning (1 call)
#   llama-3.1-8b-instant    : 20 000  → used for evaluation (many calls, short prompts)
_PLANNER_MODEL = "llama-3.3-70b-versatile"
_EVAL_MODEL = "llama-3.1-8b-instant"

# Keep description short to stay well under per-call token budget
_DESC_MAX_CHARS = 1500
# How many queries to generate / results to keep per query
_N_QUERIES = 3
_MAX_RESULTS = 3
# Seconds to wait between evaluator LLM calls to avoid TPM spikes
_EVAL_DELAY = 1.0


class AgentState(TypedDict):
    """Mutable agent state passed between LangGraph nodes."""

    profile: dict
    queries: list[str]
    raw_results: list[dict]
    evaluated_jobs: list[dict]
    status_messages: list[str]


def _groq(model: str) -> ChatGroq:
    return ChatGroq(
        model=model,
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0,
    )


def _strip_json_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


# ── compact profile string to save tokens ──────────────────────────────────
def _compact_profile(profile: dict) -> str:
    return json.dumps(
        {
            "skills": profile.get("skills", [])[:8],
            "roles": profile.get("roles", [])[:3],
            "years_experience": profile.get("years_experience", 0),
            "location": profile.get("location", ""),
        }
    )


def query_planner(state: AgentState) -> dict:
    """Generate diverse job search queries from the candidate profile."""
    profile = state["profile"]
    msgs = list(state.get("status_messages") or [])

    if not os.getenv("GROQ_API_KEY"):
        msgs.append("Generated 0 search queries")
        return {"queries": [], "status_messages": msgs}

    prompt = (
        f"Candidate profile: {_compact_profile(profile)}\n\n"
        f"Generate exactly {_N_QUERIES} diverse job search queries to find matching roles on job boards. "
        "Make them specific and varied (role title, key skill, seniority). "
        f"Return ONLY a JSON array of {_N_QUERIES} strings. No explanation."
    )
    llm = _groq(_PLANNER_MODEL)
    out = llm.invoke([HumanMessage(content=prompt)])
    content = getattr(out, "content", str(out)) or "[]"
    try:
        parsed = json.loads(_strip_json_fence(content))
        queries = [str(x) for x in parsed if x][:_N_QUERIES] if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        queries = []

    msgs.append(f"Generated {len(queries)} search queries")
    return {"queries": queries, "status_messages": msgs}


def job_searcher(state: AgentState) -> dict:
    """Run Tavily for each planned query and deduplicate by URL."""
    queries = state.get("queries") or []
    msgs = list(state.get("status_messages") or [])
    seen: set[str] = set()
    raw: list[dict] = []

    for q in queries:
        for job in search_jobs(q):
            url = job.get("url") or ""
            if not url or url in seen:
                continue
            seen.add(url)
            raw.append({**job, "company": ""})

    msgs.append(f"Found {len(raw)} job listings across {len(queries)} queries")
    return {"raw_results": raw, "status_messages": msgs}


def evaluator(state: AgentState) -> dict:
    """Score and explain each job against the profile using a fast Groq model."""
    profile = state["profile"]
    raw_results = state.get("raw_results") or []
    msgs = list(state.get("status_messages") or [])
    evaluated: list[dict] = []
    profile_str = _compact_profile(profile)

    if not os.getenv("GROQ_API_KEY"):
        for job in raw_results:
            evaluated.append({**job, "score": 0, "reasoning": "GROQ_API_KEY not configured."})
        msgs.append(f"Evaluated {len(evaluated)} jobs against candidate profile")
        return {"evaluated_jobs": evaluated, "status_messages": msgs}

    llm = _groq(_EVAL_MODEL)

    for i, job in enumerate(raw_results):
        title = (job.get("title") or "")[:120]
        description = (job.get("content") or "")[:_DESC_MAX_CHARS]

        prompt = (
            f"Profile: {profile_str}\n"
            f"Job title: {title}\n"
            f"Description: {description}\n\n"
            'Score match 0-100. Return ONLY JSON: '
            '{"score":<int>,"reasoning":"<2 sentences>"}'
        )

        score, reasoning = 0, "Could not evaluate this posting."
        try:
            out = llm.invoke([HumanMessage(content=prompt)])
            content = getattr(out, "content", str(out)) or "{}"
            data = json.loads(_strip_json_fence(content))
            score = int(data.get("score", 0))
            reasoning = str(data.get("reasoning") or reasoning)
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
        except Exception as exc:
            reasoning = f"Evaluation skipped: {exc}"

        evaluated.append({**job, "score": score, "reasoning": reasoning})

        # Throttle between calls — stay under free-tier TPM
        if i < len(raw_results) - 1:
            time.sleep(_EVAL_DELAY)

    msgs.append(f"Evaluated {len(evaluated)} jobs against candidate profile")
    return {"evaluated_jobs": evaluated, "status_messages": msgs}


def ranker(state: AgentState) -> dict:
    """Sort by score descending and keep the top 10 matches."""
    jobs = list(state.get("evaluated_jobs") or [])
    msgs = list(state.get("status_messages") or [])
    jobs.sort(key=lambda j: int(j.get("score") or 0), reverse=True)
    top = jobs[:10]
    msgs.append(f"Ranked and returning top {len(top)} matches")
    return {"evaluated_jobs": top, "status_messages": msgs}


def _build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("query_planner", query_planner)
    graph.add_node("job_searcher", job_searcher)
    graph.add_node("evaluator", evaluator)
    graph.add_node("ranker", ranker)
    graph.set_entry_point("query_planner")
    graph.add_edge("query_planner", "job_searcher")
    graph.add_edge("job_searcher", "evaluator")
    graph.add_edge("evaluator", "ranker")
    graph.add_edge("ranker", END)
    return graph.compile()


_compiled = None


def _compiled_graph():
    global _compiled
    if _compiled is None:
        _compiled = _build_graph()
    return _compiled


def run_agent(profile: dict) -> dict:
    """Execute the full agent graph and return the terminal state."""
    initial: AgentState = {
        "profile": profile,
        "queries": [],
        "raw_results": [],
        "evaluated_jobs": [],
        "status_messages": [],
    }
    return _compiled_graph().invoke(initial)
