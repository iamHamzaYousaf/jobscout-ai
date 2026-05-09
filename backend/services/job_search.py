"""Real-time job discovery via Tavily search."""

from __future__ import annotations

import os

from tavily import TavilyClient


def search_jobs(query: str) -> list[dict]:
    """
    Run an advanced Tavily search and normalize results for the agent pipeline.

    Each item contains title, url, content (as description), and source.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return []

    client = TavilyClient(api_key=api_key)
    response = client.search(
        query=query,
        search_depth="advanced",
        max_results=3,
        include_answer=False,
    )
    results: list[dict] = []
    for item in response.get("results") or []:
        results.append(
            {
                "title": item.get("title") or "",
                "url": item.get("url") or "",
                "content": item.get("content") or "",
                "source": "tavily",
            }
        )
    return results
