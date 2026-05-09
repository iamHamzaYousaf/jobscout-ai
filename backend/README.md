---
title: JobScout AI API
emoji: 🎯
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# JobScout AI — FastAPI Backend

Autonomous job-hunting agent: parses CVs, plans queries with LangGraph + Groq, searches live listings via Tavily, and scores each match.

## Endpoints

- `GET /` — Health check
- `POST /api/cv/upload` — Upload PDF or DOCX, returns structured profile
- `POST /api/jobs/search` — Run the agent, returns ranked + scored jobs

## Environment Variables

Set these as **Space Secrets** in the HF Space settings:

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq LLM API key |
| `TAVILY_API_KEY` | Tavily search API key |
