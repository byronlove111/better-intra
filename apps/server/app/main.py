from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.media.media_service import NoCacheStaticFiles, media_root
from app.router import api_router

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

app.mount(
    settings.media_url_prefix,
    NoCacheStaticFiles(directory=str(media_root())),
    name="media",
)
