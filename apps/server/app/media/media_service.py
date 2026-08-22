"""Local media storage for profile avatar and banner uploads."""

from __future__ import annotations

import io
import time
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from starlette.responses import Response
from starlette.types import Scope

from app.config import settings

_NO_STORE = "no-store, no-cache, must-revalidate, max-age=0"


class NoCacheStaticFiles(StaticFiles):
    """Avatars/banners reuse a user folder; never let browsers/CDN keep the old bytes."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = _NO_STORE
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

AVATAR_MAX_BYTES = 2 * 1024 * 1024
BANNER_MAX_BYTES = 5 * 1024 * 1024
AVATAR_MAX_SIZE = (512, 512)
BANNER_MAX_SIZE = (1920, 640)


def media_root() -> Path:
    root = Path(settings.media_root)
    root.mkdir(parents=True, exist_ok=True)
    return root


def user_media_dir(user_id: int) -> Path:
    path = media_root() / "users" / str(user_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def public_url(relative_path: str) -> str:
    prefix = settings.media_url_prefix.rstrip("/")
    relative = relative_path.lstrip("/")
    return f"{prefix}/{relative}"


def absolute_file_path(public_media_url: str | None) -> Path | None:
    if not public_media_url:
        return None
    prefix = settings.media_url_prefix.rstrip("/")
    if not public_media_url.startswith(prefix + "/"):
        return None
    relative = public_media_url[len(prefix) + 1 :]
    return media_root() / relative


def delete_media_file(public_media_url: str | None) -> None:
    path = absolute_file_path(public_media_url)
    if path is None:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def delete_user_media(user_id: int) -> None:
    directory = media_root() / "users" / str(user_id)
    if not directory.exists():
        return
    for child in directory.iterdir():
        if child.is_file():
            try:
                child.unlink()
            except OSError:
                pass
    try:
        directory.rmdir()
    except OSError:
        pass


async def _read_upload(file: UploadFile, *, max_bytes: int) -> bytes:
    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d’image non supporté (JPEG, PNG, WebP, GIF).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier vide.",
        )
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image trop lourde (max {max_bytes // (1024 * 1024)} Mo).",
        )
    return data


def _process_image(data: bytes, *, max_size: tuple[int, int], cover: bool) -> bytes:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier image invalide.",
        ) from exc

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    if cover:
        image = _cover_resize(image, max_size)
    else:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85, method=4)
    return buffer.getvalue()


def _cover_resize(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    target_w, target_h = max_size
    src_w, src_h = image.size
    scale = max(target_w / src_w, target_h / src_h)
    new_size = (max(1, int(src_w * scale)), max(1, int(src_h * scale)))
    resized = image.resize(new_size, Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, (resized.height - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


async def save_avatar(user_id: int, file: UploadFile) -> str:
    data = await _read_upload(file, max_bytes=AVATAR_MAX_BYTES)
    processed = _process_image(data, max_size=AVATAR_MAX_SIZE, cover=True)
    filename = f"avatar-{time.time_ns()}.webp"
    relative = f"users/{user_id}/{filename}"
    (user_media_dir(user_id) / filename).write_bytes(processed)
    return public_url(relative)


async def save_banner(user_id: int, file: UploadFile) -> str:
    data = await _read_upload(file, max_bytes=BANNER_MAX_BYTES)
    processed = _process_image(data, max_size=BANNER_MAX_SIZE, cover=True)
    filename = f"banner-{time.time_ns()}.webp"
    relative = f"users/{user_id}/{filename}"
    (user_media_dir(user_id) / filename).write_bytes(processed)
    return public_url(relative)
