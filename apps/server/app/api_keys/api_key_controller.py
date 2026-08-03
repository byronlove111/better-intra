from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api_keys import api_key_service
from app.api_keys.api_key_schemas import ApiKeyCreatedOut, ApiKeyOut, CreateApiKeyRequest
from app.deps import get_current_user, get_db
from app.users.user_model import User

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post(
    "",
    response_model=ApiKeyCreatedOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an API key",
    description=(
        "Generate a personal API key for the public events API (`X-API-Key`). "
        "The raw `key` is returned **once** — store it securely."
    ),
)
def create_api_key(
    body: CreateApiKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKeyCreatedOut:
    return api_key_service.create_api_key(db, user=current_user, name=body.name)


@router.get(
    "",
    response_model=list[ApiKeyOut],
    summary="List my API keys",
    description="Does not include raw key values — only prefix and metadata.",
)
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ApiKeyOut]:
    return api_key_service.list_api_keys(db, user=current_user)


@router.delete(
    "/{key_id}",
    response_model=ApiKeyOut,
    summary="Revoke an API key",
)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKeyOut:
    return api_key_service.revoke_api_key(db, user=current_user, key_id=key_id)
