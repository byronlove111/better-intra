from fastapi import APIRouter

from app.auth.auth_controller import router as auth_router
from app.health.controller import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router)
