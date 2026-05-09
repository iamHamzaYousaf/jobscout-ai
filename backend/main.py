"""FastAPI entrypoint for JobScout AI backend."""

import logging
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import cv, jobs

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("jobscout")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="JobScout AI")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        tb = traceback.format_exc()
        logger.error("Unhandled exception on %s:\n%s", request.url, tb)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {type(exc).__name__}: {exc}"},
        )

    app.include_router(cv.router, prefix="/api/cv", tags=["cv"])
    app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

    @app.get("/")
    def health_check() -> dict[str, str]:
        """Liveness probe for deployment and monitoring."""
        groq_set = bool(os.getenv("GROQ_API_KEY"))
        tavily_set = bool(os.getenv("TAVILY_API_KEY"))
        return {
            "status": "ok",
            "service": "JobScout AI",
            "groq_key_set": str(groq_set),
            "tavily_key_set": str(tavily_set),
        }

    return app


app = create_app()
