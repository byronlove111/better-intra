from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.deps import get_db, require_intra_linked
from app.intra.intra_schemas import (
    IntraEvaluationsPage,
    IntraEventsPage,
    IntraLogtimeOut,
    IntraProfileOut,
    IntraProjectsPage,
    IntraUserProfileOut,
    IntraUsersPage,
)
from app.intra.intra_service import (
    build_evaluation,
    build_event,
    build_intra_profile,
    build_logtime,
    build_project,
    build_public_user_profile,
    build_user_summary,
    fetch_intra_me,
    fetch_intra_user,
    forty_two_get_cached,
    get_valid_forty_two_access_token,
    page_meta_from_headers,
    primary_campus_id,
    resolve_forty_two_user_id,
)
from app.users.user_model import User

router = APIRouter(tags=["intra"])


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------


def _require_forty_two_id(user: User) -> int:
    if user.forty_two_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account first",
        )
    return user.forty_two_id


def _projects_page(
    access_token: str,
    forty_two_id: int,
    *,
    page: int,
    page_size: int,
    sort: str,
) -> IntraProjectsPage:
    params = {
        "page[number]": page,
        "page[size]": page_size,
        "sort": sort,
    }
    payload, headers = forty_two_get_cached(
        access_token,
        f"/users/{forty_two_id}/projects_users",
        params,
        cache_key=f"projects:{forty_two_id}:{page}:{page_size}:{sort}",
    )
    items = [build_project(item) for item in payload] if isinstance(payload, list) else []
    return IntraProjectsPage.model_validate(
        {"items": items, "meta": page_meta_from_headers(headers, page=page, page_size=page_size)}
    )


def _evaluations_page(
    access_token: str,
    forty_two_id: int,
    *,
    role: Literal["all", "corrector", "corrected"],
    page: int,
    page_size: int,
    sort: str,
) -> IntraEvaluationsPage:
    params = {
        "page[number]": page,
        "page[size]": page_size,
        "sort": sort,
    }
    items: list[dict[str, Any]] = []
    meta: dict[str, Any] = {"page": page, "page_size": page_size, "total": None}

    roles: list[Literal["corrector", "corrected"]]
    if role == "all":
        roles = ["corrector", "corrected"]
    else:
        roles = [role]

    totals: list[int] = []
    for current_role in roles:
        path = f"/users/{forty_two_id}/scale_teams/as_{current_role}"
        payload, headers = forty_two_get_cached(
            access_token,
            path,
            params,
            cache_key=f"evals:{forty_two_id}:{current_role}:{page}:{page_size}:{sort}",
        )
        if isinstance(payload, list):
            items.extend(build_evaluation(item, role=current_role) for item in payload)
        page_meta = page_meta_from_headers(headers, page=page, page_size=page_size)
        if page_meta["total"] is not None:
            totals.append(page_meta["total"])

    if totals:
        meta["total"] = sum(totals)

    def _sort_key(item: dict[str, Any]) -> str:
        value = item.get("begin_at")
        return value.isoformat() if isinstance(value, datetime) else str(value or "")

    items.sort(key=_sort_key, reverse=True)
    return IntraEvaluationsPage.model_validate({"items": items, "meta": meta})


def _logtime(
    access_token: str,
    forty_two_id: int,
    *,
    begin_at: datetime | None,
    end_at: datetime | None,
    page: int,
    page_size: int,
) -> IntraLogtimeOut:
    params: dict[str, Any] = {
        "page[number]": page,
        "page[size]": page_size,
        "sort": "-begin_at",
    }
    if begin_at is not None and end_at is not None:
        params["range[begin_at]"] = f"{begin_at.isoformat()},{end_at.isoformat()}"

    cache_key = (
        f"locations:{forty_two_id}:{page}:{page_size}:"
        f"{begin_at.isoformat() if begin_at else ''}:{end_at.isoformat() if end_at else ''}"
    )
    payload, _ = forty_two_get_cached(
        access_token,
        f"/users/{forty_two_id}/locations",
        params,
        cache_key=cache_key,
    )
    locations = payload if isinstance(payload, list) else []
    return IntraLogtimeOut.model_validate(
        build_logtime(locations, begin_at=begin_at, end_at=end_at)
    )


# ---------------------------------------------------------------------------
# ME — PROFILE
# ---------------------------------------------------------------------------


@router.get(
    "/me/intra",
    response_model=IntraProfileOut,
    summary="My Intra profile",
    description=(
        "Proxy to 42 `GET /v2/me`. Requires a linked Intra account. "
        "Returns a filtered profile: login, avatar, campus, wallet, cursus levels, etc."
    ),
)
def get_my_intra_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> IntraProfileOut:
    access_token = get_valid_forty_two_access_token(db, current_user)
    me = fetch_intra_me(access_token, cache_key=str(current_user.id))
    return IntraProfileOut.model_validate(build_intra_profile(me))


# ---------------------------------------------------------------------------
# ME — PROJECTS
# ---------------------------------------------------------------------------


@router.get(
    "/me/intra/projects",
    response_model=IntraProjectsPage,
    summary="My Intra projects",
    description="Proxy to 42 `GET /v2/users/:id/projects_users` (status, marks, project name).",
)
def get_my_intra_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    sort: str = Query("-updated_at"),
) -> IntraProjectsPage:
    access_token = get_valid_forty_two_access_token(db, current_user)
    return _projects_page(
        access_token,
        _require_forty_two_id(current_user),
        page=page,
        page_size=page_size,
        sort=sort,
    )


# ---------------------------------------------------------------------------
# ME — EVENTS (campus)
# ---------------------------------------------------------------------------


@router.get(
    "/me/intra/events",
    response_model=IntraEventsPage,
    summary="Campus Intra events",
    description=(
        "Proxy to 42 `GET /v2/campus/:campus_id/events` with filters, sort and pagination. "
        "If `campus_id` is omitted, uses the user's primary campus."
    ),
)
def get_intra_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    campus_id: int | None = Query(None, description="Campus id; defaults to primary campus"),
    kind: str | None = Query(None, description="Event kind filter, e.g. conference"),
    name: str | None = Query(None, description="Partial name search"),
    begin_at: datetime | None = Query(None, description="Range start (inclusive)"),
    end_at: datetime | None = Query(None, description="Range end (inclusive)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    sort: str = Query("-begin_at"),
) -> IntraEventsPage:
    access_token = get_valid_forty_two_access_token(db, current_user)

    resolved_campus_id = campus_id
    if resolved_campus_id is None:
        me = fetch_intra_me(access_token, cache_key=str(current_user.id))
        resolved_campus_id = primary_campus_id(me)
    if resolved_campus_id is None:
        return IntraEventsPage.model_validate(
            {"items": [], "meta": {"page": page, "page_size": page_size, "total": 0}}
        )

    params: dict[str, Any] = {
        "page[number]": page,
        "page[size]": page_size,
        "sort": sort,
    }
    if kind:
        params["filter[kind]"] = kind
    if name:
        params["filter[name]"] = name
    if begin_at is not None and end_at is not None:
        params["range[begin_at]"] = f"{begin_at.isoformat()},{end_at.isoformat()}"

    range_key = params.get("range[begin_at]", "")
    payload, headers = forty_two_get_cached(
        access_token,
        f"/campus/{resolved_campus_id}/events",
        params,
        cache_key=(
            f"events:{resolved_campus_id}:{page}:{page_size}:{sort}:"
            f"{kind or ''}:{name or ''}:{range_key}"
        ),
    )
    items = [build_event(item) for item in payload] if isinstance(payload, list) else []
    return IntraEventsPage.model_validate(
        {"items": items, "meta": page_meta_from_headers(headers, page=page, page_size=page_size)}
    )


# ---------------------------------------------------------------------------
# ME — EVALUATIONS
# ---------------------------------------------------------------------------


@router.get(
    "/me/intra/evaluations",
    response_model=IntraEvaluationsPage,
    summary="My Intra evaluations",
    description=(
        "Proxy to 42 scale_teams as corrector and/or corrected "
        "(`GET /v2/users/:id/scale_teams/as_corrector|as_corrected`)."
    ),
)
def get_my_intra_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    role: Literal["all", "corrector", "corrected"] = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    sort: str = Query("-begin_at"),
) -> IntraEvaluationsPage:
    access_token = get_valid_forty_two_access_token(db, current_user)
    return _evaluations_page(
        access_token,
        _require_forty_two_id(current_user),
        role=role,
        page=page,
        page_size=page_size,
        sort=sort,
    )


# ---------------------------------------------------------------------------
# ME — LOGTIME
# ---------------------------------------------------------------------------


@router.get(
    "/me/intra/logtime",
    response_model=IntraLogtimeOut,
    summary="My Intra logtime",
    description=(
        "Proxy to 42 `GET /v2/users/:id/locations`, then aggregate hours per day. "
        "`locations_stats` is not available for our OAuth app (403), so we compute stats ourselves."
    ),
)
def get_my_intra_logtime(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
) -> IntraLogtimeOut:
    access_token = get_valid_forty_two_access_token(db, current_user)
    return _logtime(
        access_token,
        _require_forty_two_id(current_user),
        begin_at=begin_at,
        end_at=end_at,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# USERS — SEARCH
# ---------------------------------------------------------------------------


@router.get(
    "/intra/users",
    response_model=IntraUsersPage,
    summary="Search Intra users",
    description="Proxy to 42 `GET /v2/users` with `search[login]` (partial) or exact `filter[login]`.",
)
def search_intra_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    q: str = Query(..., min_length=1, description="Login search query"),
    exact: bool = Query(False, description="If true, use filter[login] exact match"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> IntraUsersPage:
    access_token = get_valid_forty_two_access_token(db, current_user)
    params: dict[str, Any] = {
        "page[number]": page,
        "page[size]": page_size,
        "sort": "login",
    }
    if exact:
        params["filter[login]"] = q
    else:
        params["search[login]"] = q

    payload, headers = forty_two_get_cached(
        access_token,
        "/users",
        params,
        cache_key=f"search:{q.lower()}:{exact}:{page}:{page_size}",
        ttl_seconds=120.0,
    )
    items = [build_user_summary(item) for item in payload] if isinstance(payload, list) else []
    return IntraUsersPage.model_validate(
        {"items": items, "meta": page_meta_from_headers(headers, page=page, page_size=page_size)}
    )


# ---------------------------------------------------------------------------
# USERS — PROJECTS
# ---------------------------------------------------------------------------


@router.get(
    "/intra/users/{login}/projects",
    response_model=IntraProjectsPage,
    summary="Intra user projects",
    description="Proxy projects for any Intra login via `GET /v2/users/:id/projects_users`.",
)
def get_intra_user_projects(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    sort: str = Query("-updated_at"),
) -> IntraProjectsPage:
    access_token = get_valid_forty_two_access_token(db, current_user)
    forty_two_id = resolve_forty_two_user_id(access_token, login)
    return _projects_page(
        access_token,
        forty_two_id,
        page=page,
        page_size=page_size,
        sort=sort,
    )


# ---------------------------------------------------------------------------
# USERS — EVALUATIONS
# ---------------------------------------------------------------------------


@router.get(
    "/intra/users/{login}/evaluations",
    response_model=IntraEvaluationsPage,
    summary="Intra user evaluations",
    description="Proxy evaluations (corrector/corrected) for any Intra login.",
)
def get_intra_user_evaluations(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    role: Literal["all", "corrector", "corrected"] = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    sort: str = Query("-begin_at"),
) -> IntraEvaluationsPage:
    access_token = get_valid_forty_two_access_token(db, current_user)
    forty_two_id = resolve_forty_two_user_id(access_token, login)
    return _evaluations_page(
        access_token,
        forty_two_id,
        role=role,
        page=page,
        page_size=page_size,
        sort=sort,
    )


# ---------------------------------------------------------------------------
# USERS — LOGTIME
# ---------------------------------------------------------------------------


@router.get(
    "/intra/users/{login}/logtime",
    response_model=IntraLogtimeOut,
    summary="Intra user logtime",
    description="Proxy locations + daily hour aggregation for any Intra login.",
)
def get_intra_user_logtime(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
) -> IntraLogtimeOut:
    access_token = get_valid_forty_two_access_token(db, current_user)
    forty_two_id = resolve_forty_two_user_id(access_token, login)
    return _logtime(
        access_token,
        forty_two_id,
        begin_at=begin_at,
        end_at=end_at,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# USERS — PROFILE
# ---------------------------------------------------------------------------


@router.get(
    "/intra/users/{login}",
    response_model=IntraUserProfileOut,
    summary="Intra user profile",
    description=(
        "Proxy to 42 `GET /v2/users/:login`. Returns a public-safe filtered profile "
        "(no email). Requires your Intra account to be linked."
    ),
)
def get_intra_user_profile(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> IntraUserProfileOut:
    access_token = get_valid_forty_two_access_token(db, current_user)
    payload = fetch_intra_user(access_token, login)
    return IntraUserProfileOut.model_validate(build_public_user_profile(payload))
