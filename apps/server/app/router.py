from fastapi import APIRouter

from app.api_keys.api_key_controller import router as api_keys_router
from app.auth.auth_controller import router as auth_router
from app.chat.chat_controller import router as chat_router
from app.events.event_controller import router as events_router
from app.events.public_event_controller import router as public_events_router
from app.friends.friend_controller import router as friends_router
from app.health.controller import router as health_router
from app.intra.intra_controller import router as intra_router
from app.realtime.ws_controller import router as ws_router
from app.users.user_controller import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(friends_router)
api_router.include_router(intra_router)
api_router.include_router(api_keys_router)
api_router.include_router(events_router)
api_router.include_router(public_events_router)
api_router.include_router(chat_router)
api_router.include_router(ws_router)
