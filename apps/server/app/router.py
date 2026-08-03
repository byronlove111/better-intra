from fastapi import APIRouter

from app.auth.auth_controller import router as auth_router
from app.friends.friend_controller import router as friends_router
from app.health.controller import router as health_router
from app.intra.intra_controller import router as intra_router
from app.users.user_controller import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(friends_router)
api_router.include_router(intra_router)
