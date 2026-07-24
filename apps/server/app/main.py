from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import engine

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/health/db")
def health_db() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
