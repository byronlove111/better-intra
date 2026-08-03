import hashlib
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api_keys import api_key_repository
from app.api_keys.api_key_model import ApiKey
from app.api_keys.api_key_schemas import ApiKeyCreatedOut, ApiKeyOut
from app.users.user_model import User

KEY_PREFIX = "bi_"


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_raw_key() -> tuple[str, str]:
    """Return (raw_key, display_prefix)."""
    token = secrets.token_urlsafe(32)
    raw = f"{KEY_PREFIX}{token}"
    prefix = raw[:12]
    return raw, prefix


def create_api_key(db: Session, *, user: User, name: str) -> ApiKeyCreatedOut:
    raw, prefix = generate_raw_key()
    row = api_key_repository.create(
        db,
        user_id=user.id,
        name=name.strip(),
        prefix=prefix,
        key_hash=hash_api_key(raw),
    )
    return ApiKeyCreatedOut(
        id=row.id,
        name=row.name,
        prefix=row.prefix,
        key=raw,
        created_at=row.created_at,
    )


def list_api_keys(db: Session, *, user: User) -> list[ApiKeyOut]:
    rows = api_key_repository.list_for_user(db, user_id=user.id)
    return [
        ApiKeyOut(
            id=r.id,
            name=r.name,
            prefix=r.prefix,
            created_at=r.created_at,
            last_used_at=r.last_used_at,
            revoked_at=r.revoked_at,
        )
        for r in rows
    ]


def revoke_api_key(db: Session, *, user: User, key_id: int) -> ApiKeyOut:
    row = api_key_repository.get_by_id_for_user(db, key_id=key_id, user_id=user.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    if row.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="API key already revoked")
    row = api_key_repository.revoke(db, row)
    return ApiKeyOut(
        id=row.id,
        name=row.name,
        prefix=row.prefix,
        created_at=row.created_at,
        last_used_at=row.last_used_at,
        revoked_at=row.revoked_at,
    )


def resolve_user_from_api_key(db: Session, *, raw_key: str) -> tuple[User, ApiKey]:
    from app.users import user_repository

    if not raw_key or not raw_key.startswith(KEY_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    row = api_key_repository.get_active_by_hash(db, key_hash=hash_api_key(raw_key))
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    user = user_repository.get_by_id(db, row.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    api_key_repository.touch_last_used(db, row)
    return user, row
