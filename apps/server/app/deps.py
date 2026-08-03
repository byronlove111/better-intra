"""Shared FastAPI dependencies."""

from collections.abc import Generator

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api_keys import api_key_service
from app.api_keys.rate_limit import check_rate_limit
from app.auth.auth_service import decode_access_token
from app.db import SessionLocal
from app.users import user_repository
from app.users.user_model import User

bearer_scheme = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user = user_repository.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_intra_linked(current_user: User = Depends(get_current_user)) -> User:
    """Block routes that need a linked 42 Intra account."""
    if not current_user.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account first",
        )
    return current_user


def get_current_user_from_api_key(
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> User:
    """Authenticate public API callers via personal API key + enforce rate limit."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    user, api_key = api_key_service.resolve_user_from_api_key(db, raw_key=x_api_key)
    check_rate_limit(api_key.id)
    return user
