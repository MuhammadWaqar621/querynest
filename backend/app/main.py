"""
querynest backend entrypoint.

Phase 1 scope: app scaffold, health check, and config-status endpoint only.
Auth, document ingestion, and RAG chat logic are implemented in later
phases (see README.md for the roadmap).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.config_status import router as config_status_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="querynest API",
    description="RAG-powered document chat assistant - backend API",
    version="0.1.0",
)

# Permissive CORS for local development. Tighten this once the frontend
# origin(s) are finalized / auth is introduced in a later phase.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config_status_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Basic liveness check used by docker-compose / uptime probes."""
    return {"status": "ok", "app": settings.APP_NAME}
