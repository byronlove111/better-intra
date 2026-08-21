from datetime import UTC, datetime, timedelta

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.auth_schemas import (
    FortyTwoAuthorizeResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.auth.auth_service import (
    build_forty_two_authorize_url,
    create_access_token,
    create_oauth_state,
    create_refresh_token,
    decode_oauth_state,
    decode_refresh_token,
    exchange_code_for_tokens,
    extract_avatar_url,
    fetch_forty_two_me,
    hash_password,
    require_forty_two_oauth_config,
    verify_password,
)
from app.config import settings
from app.deps import get_current_user, get_db
from app.users import user_repository
from app.users.user_model import User
from app.users.user_schemas import UserOut
from app.users.user_service import serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# EMAIL / PASSWORD
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register",
    description="Create a BetterIntra account with email/password. Returns JWT access + refresh tokens.",
)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    password_hash = hash_password(body.password)
    try:
        user = user_repository.create_user(db, email=body.email, password_hash=password_hash)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=serialize_user(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="Authenticate with email/password. Returns JWT access + refresh tokens.",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = user_repository.get_by_email(db, body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=serialize_user(user),
    )


# ---------------------------------------------------------------------------
# JWT REFRESH
# ---------------------------------------------------------------------------


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description=(
        "Exchange a valid refresh JWT for a new access token and a new refresh token. "
        "Use this when the access token expired, without asking for the password again."
    ),
)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        payload = decode_refresh_token(body.refresh_token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from None

    user = user_repository.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=serialize_user(user),
    )


# ---------------------------------------------------------------------------
# CURRENT USER
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserOut,
    summary="Current user",
    description="Return the authenticated user. Requires `Authorization: Bearer <access_token>`.",
)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return serialize_user(current_user)


# ---------------------------------------------------------------------------
# OAUTH 42 — LINK INTRA
# ---------------------------------------------------------------------------


@router.get(
    "/42",
    response_model=FortyTwoAuthorizeResponse,
    summary="Start 42 Intra link",
    description=(
        "Requires a logged-in BetterIntra user (Bearer JWT). "
        "Returns `authorize_url` — the front should redirect the browser there "
        "(`window.location = authorize_url`) so the user can authorize on Intra."
    ),
)
def link_forty_two_start(current_user: User = Depends(get_current_user)) -> FortyTwoAuthorizeResponse:
    try:
        require_forty_two_oauth_config()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from None

    state = create_oauth_state(current_user.id)
    return FortyTwoAuthorizeResponse(authorize_url=build_forty_two_authorize_url(state))


@router.get(
    "/callback",
    summary="42 OAuth callback",
    description=(
        "Called by Intra after the user accepts/denies. "
        "Exchanges `code` for tokens, links the 42 account on the User, "
        "then redirects to the frontend (`/?intra=linked` or `/?intra=error&reason=...`). "
        "Do not call this manually from the SPA — the browser lands here from 42."
    ),
    responses={302: {"description": "Redirect to frontend with intra=linked or intra=error"}},
)
def link_forty_two_callback(
    db: Session = Depends(get_db),
    code: str | None = Query(None, description="Authorization code from 42"),
    state: str | None = Query(None, description="Signed state tying the flow to the BetterIntra user"),
    error: str | None = Query(None, description="Error code if the user denied access on 42"),
) -> RedirectResponse:
    frontend = settings.frontend_url.rstrip("/")

    if error:
        return RedirectResponse(url=f"{frontend}/?intra=error&reason={error}", status_code=status.HTTP_302_FOUND)

    if not code or not state:
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=missing_code", status_code=status.HTTP_302_FOUND)

    try:
        user_id = decode_oauth_state(state)
    except (jwt.PyJWTError, ValueError, KeyError):
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=invalid_state", status_code=status.HTTP_302_FOUND)

    user = user_repository.get_by_id(db, user_id)
    if user is None:
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=user_not_found", status_code=status.HTTP_302_FOUND)

    try:
        token_payload = exchange_code_for_tokens(code)
        access_token = token_payload["access_token"]
        refresh_token = token_payload.get("refresh_token")
        expires_in = int(token_payload.get("expires_in", 7200))
        me_payload = fetch_forty_two_me(access_token)
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=token_exchange", status_code=status.HTTP_302_FOUND)

    forty_two_id = int(me_payload["id"])
    existing = user_repository.get_by_forty_two_id(db, forty_two_id)
    if existing is not None and existing.id != user.id:
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=already_linked", status_code=status.HTTP_302_FOUND)

    try:
        user_repository.link_forty_two(
            db,
            user,
            forty_two_id=forty_two_id,
            login=str(me_payload["login"]),
            display_name=me_payload.get("displayname") or me_payload.get("usual_full_name"),
            avatar_url=extract_avatar_url(me_payload),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=datetime.now(UTC) + timedelta(seconds=expires_in),
        )
    except IntegrityError:
        db.rollback()
        return RedirectResponse(url=f"{frontend}/?intra=error&reason=db_conflict", status_code=status.HTTP_302_FOUND)

    return RedirectResponse(url=f"{frontend}/?intra=linked", status_code=status.HTTP_302_FOUND)
