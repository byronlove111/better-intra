from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth_service import extract_avatar_url, require_forty_two_oauth_config
from app.config import settings
from app.users import user_repository
from app.users.user_model import User


def refresh_forty_two_tokens(refresh_token: str) -> dict[str, Any]:
    require_forty_two_oauth_config()
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            settings.forty_two_token_url,
            data={
                "grant_type": "refresh_token",
                "client_id": settings.forty_two_client_id,
                "client_secret": settings.forty_two_client_secret,
                "refresh_token": refresh_token,
            },
        )
        response.raise_for_status()
        return response.json()


def get_valid_forty_two_access_token(db: Session, user: User) -> str:
    if not user.forty_two_access_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account first",
        )

    now = datetime.now(UTC)
    expires_at = user.forty_two_token_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    still_valid = expires_at is not None and expires_at > now + timedelta(seconds=60)
    if still_valid:
        return user.forty_two_access_token

    if not user.forty_two_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Intra token expired. Link your Intra account again.",
        )

    try:
        payload = refresh_forty_two_tokens(user.forty_two_refresh_token)
        access_token = str(payload["access_token"])
        refresh_token = payload.get("refresh_token") or user.forty_two_refresh_token
        expires_in = int(payload.get("expires_in", 7200))
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh Intra token. Link your Intra account again.",
        ) from exc

    user_repository.update_forty_two_tokens(
        db,
        user,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expires_at=now + timedelta(seconds=expires_in),
    )
    return access_token


def _raise_forty_two_http_error(response: httpx.Response) -> None:
    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Intra token rejected. Link your Intra account again.",
        )
    if response.status_code == 403:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this Intra resource",
        )
    if response.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intra resource not found")
    if response.status_code == 429:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="42 API rate limit exceeded. Retry shortly.",
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"42 API error ({response.status_code})",
    )


def forty_two_get(
    access_token: str,
    path: str,
    params: dict[str, Any] | None = None,
) -> tuple[Any, dict[str, str]]:
    """GET a 42 API path with the user's OAuth token. Returns (json, response headers)."""
    require_forty_two_oauth_config()
    clean_params = {key: value for key, value in (params or {}).items() if value is not None}
    url = f"{settings.forty_two_api_base_url}{path}"
    if clean_params:
        url = f"{url}?{urlencode(clean_params, doseq=True)}"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers={"Authorization": f"Bearer {access_token}"})
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach 42 API",
        ) from exc

    if response.status_code >= 400:
        _raise_forty_two_http_error(response)

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid JSON from 42 API",
        ) from exc

    headers = {key.lower(): value for key, value in response.headers.items()}
    return payload, headers


def page_meta_from_headers(
    headers: dict[str, str],
    *,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    total_raw = headers.get("x-total")
    total = int(total_raw) if total_raw and total_raw.isdigit() else None
    return {"page": page, "page_size": page_size, "total": total}


def fetch_intra_user(access_token: str, login_or_id: str) -> dict[str, Any]:
    payload, _ = forty_two_get(access_token, f"/users/{login_or_id}")
    if not isinstance(payload, dict) or payload.get("id") is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected user payload from 42 API",
        )
    return payload


def resolve_forty_two_user_id(access_token: str, login_or_id: str) -> int:
    user = fetch_intra_user(access_token, login_or_id)
    return int(user["id"])


def fetch_intra_me(access_token: str) -> dict[str, Any]:
    payload, _ = forty_two_get(access_token, "/me")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unexpected /me payload")
    return payload


def primary_campus_id(me: dict[str, Any]) -> int | None:
    campus_users = me.get("campus_users") or []
    for item in campus_users:
        if item.get("is_primary"):
            return item.get("campus_id")
    campus = me.get("campus") or []
    if campus:
        return campus[0].get("id")
    return None


def build_intra_profile(me: dict[str, Any]) -> dict[str, Any]:
    campus = []
    for item in me.get("campus") or []:
        campus.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "city": item.get("city"),
                "country": item.get("country"),
            }
        )

    cursus = []
    for item in me.get("cursus_users") or []:
        cursus_info = item.get("cursus") or {}
        cursus.append(
            {
                "id": cursus_info.get("id"),
                "name": cursus_info.get("name"),
                "slug": cursus_info.get("slug"),
                "grade": item.get("grade"),
                "level": item.get("level"),
                "begin_at": item.get("begin_at"),
                "end_at": item.get("end_at"),
                "blackholed_at": item.get("blackholed_at"),
            }
        )

    return {
        "id": me.get("id"),
        "login": me.get("login"),
        "email": me.get("email"),
        "displayname": me.get("displayname") or me.get("usual_full_name"),
        "wallet": me.get("wallet"),
        "correction_point": me.get("correction_point"),
        "location": me.get("location"),
        "pool_month": me.get("pool_month"),
        "pool_year": me.get("pool_year"),
        "avatar_url": extract_avatar_url(me),
        "campus": campus,
        "cursus": cursus,
    }


def build_project(item: dict[str, Any]) -> dict[str, Any]:
    project = item.get("project") or {}
    return {
        "id": item.get("id"),
        "status": item.get("status"),
        "final_mark": item.get("final_mark"),
        "validated": item.get("validated?"),
        "marked_at": item.get("marked_at"),
        "project_id": project.get("id"),
        "project_name": project.get("name"),
        "project_slug": project.get("slug"),
        "cursus_ids": item.get("cursus_ids") or [],
        "updated_at": item.get("updated_at"),
    }


def build_event(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "description": item.get("description"),
        "location": item.get("location"),
        "kind": item.get("kind"),
        "max_people": item.get("max_people"),
        "nbr_subscribers": item.get("nbr_subscribers"),
        "begin_at": item.get("begin_at"),
        "end_at": item.get("end_at"),
        "campus_ids": item.get("campus_ids") or [],
        "cursus_ids": item.get("cursus_ids") or [],
    }


def _slug_from_gitlab_path(path: str | None) -> str | None:
    """Last segment of e.g. pedago_world/42-cursus/inner-circle/ft_irc → ft_irc."""
    if not path or not isinstance(path, str):
        return None
    segment = path.rstrip("/").split("/")[-1].strip()
    return segment or None


def _team_project_name(team: dict[str, Any] | None) -> tuple[str | None, str | None]:
    """Resolve project name/slug from a scale_team.team payload.

    42's nested ``team.project`` is usually absent on scale_teams; ``team.name`` is the
    *team* name (e.g. \"zmata's team\"), not the project. Prefer nested project, then
    ``project_gitlab_path`` last segment — never fall back to ``team.name``.
    """
    if not team:
        return None, None
    project = team.get("project") or {}
    if isinstance(project, dict) and (project.get("name") or project.get("slug")):
        slug = project.get("slug") or _slug_from_gitlab_path(team.get("project_gitlab_path"))
        return project.get("name") or slug, slug

    slug = _slug_from_gitlab_path(team.get("project_gitlab_path"))
    return slug, slug


def _build_evaluation_feedbacks(item: dict[str, Any]) -> list[dict[str, Any]]:
    """Ratings/comments from corrected → corrector (already on the scale_team payload)."""
    raw = item.get("feedbacks")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for fb in raw:
        if not isinstance(fb, dict):
            continue
        user = fb.get("user") or {}
        details_raw = fb.get("feedback_details") or []
        details = [
            {"kind": d.get("kind"), "rate": d.get("rate")}
            for d in details_raw
            if isinstance(d, dict) and d.get("kind") is not None
        ]
        out.append(
            {
                "from_login": user.get("login") if isinstance(user, dict) else None,
                "rating": fb.get("rating"),
                "comment": fb.get("comment"),
                "details": details,
            }
        )
    return out


def build_evaluation(item: dict[str, Any], *, role: str) -> dict[str, Any]:
    team = item.get("team") or {}
    project_name, project_slug = _team_project_name(team)
    corrector = item.get("corrector") or {}
    corrected = item.get("correcteds") or []
    return {
        "id": item.get("id"),
        "role": role,
        "begin_at": item.get("begin_at"),
        "final_mark": item.get("final_mark"),
        "comment": item.get("comment"),
        "project_name": project_name,
        "project_slug": project_slug,
        "project_id": team.get("project_id"),
        "team_name": team.get("name"),
        "corrector_login": corrector.get("login"),
        "corrected_logins": [user.get("login") for user in corrected if user.get("login")],
        "feedbacks": _build_evaluation_feedbacks(item),
    }


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def build_location_session(item: dict[str, Any]) -> dict[str, Any]:
    begin_at = _parse_dt(item.get("begin_at")) if isinstance(item.get("begin_at"), str) else item.get("begin_at")
    end_at = _parse_dt(item.get("end_at")) if isinstance(item.get("end_at"), str) else item.get("end_at")
    duration = None
    if isinstance(begin_at, datetime) and isinstance(end_at, datetime):
        duration = max(int((end_at - begin_at).total_seconds()), 0)
    return {
        "id": item.get("id"),
        "begin_at": begin_at,
        "end_at": end_at,
        "host": item.get("host"),
        "campus_id": item.get("campus_id"),
        "duration_seconds": duration,
    }


def build_logtime(
    locations: list[dict[str, Any]],
    *,
    begin_at: datetime | None,
    end_at: datetime | None,
) -> dict[str, Any]:
    sessions = [build_location_session(item) for item in locations]
    by_day: dict[str, int] = defaultdict(int)
    total = 0
    for session in sessions:
        seconds = session.get("duration_seconds") or 0
        total += seconds
        begin = session.get("begin_at")
        if isinstance(begin, datetime):
            by_day[begin.astimezone(UTC).date().isoformat()] += seconds

    days = [{"date": day, "duration_seconds": seconds} for day, seconds in sorted(by_day.items())]
    return {
        "begin_at": begin_at,
        "end_at": end_at,
        "total_seconds": total,
        "days": days,
        "sessions": sessions,
    }


def build_user_summary(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "login": user.get("login"),
        "displayname": user.get("displayname") or user.get("usual_full_name"),
        "avatar_url": extract_avatar_url(user),
        "location": user.get("location"),
        "pool_month": user.get("pool_month"),
        "pool_year": user.get("pool_year"),
        "kind": user.get("kind"),
    }


def build_public_user_profile(user: dict[str, Any]) -> dict[str, Any]:
    profile = build_intra_profile(user)
    # Never expose another student's email through our API
    profile.pop("email", None)
    summary = build_user_summary(user)
    return {**summary, **{k: profile[k] for k in ("wallet", "correction_point", "campus", "cursus")}}
