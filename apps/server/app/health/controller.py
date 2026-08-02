from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.db import engine

router = APIRouter()


# ---------------------------------------------------------------------------
# HEALTH CHECKS
# ---------------------------------------------------------------------------


@router.get(
    "/health",
    summary="API health",
    description="Simple liveness check. Returns ok if the API process is up.",
)
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@router.get(
    "/health/db",
    summary="Database health",
    description="Runs `SELECT 1` against Postgres. Fails if the database is unreachable.",
)
def health_db() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
