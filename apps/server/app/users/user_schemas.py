from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.intra.intra_schemas import IntraProfileOut


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    forty_two_id: int | None
    login: str | None
    display_name: str | None
    avatar_url: str | None
    banner_url: str | None = None
    has_custom_avatar: bool = False
    bio: str | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    def is_intra_linked(self) -> bool:
        return self.forty_two_id is not None


class UserProfileOut(BaseModel):
    """Unified profile: Intra always (when viewer linked) + optional BetterIntra overlay."""

    model_config = ConfigDict(from_attributes=True)

    login: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    has_custom_avatar: bool = False
    forty_two_id: int | None = None
    intra: IntraProfileOut | None = None

    # Front permission flag: show BI-only UI when true
    is_betterintra_linked: bool = False
    # Present when is_betterintra_linked
    id: int | None = None
    email: EmailStr | None = None
    bio: str | None = None
    # Live presence when target has a BetterIntra account (WS connected)
    is_online: bool | None = None
    # For /users/me CTA: has the current account linked Intra?
    is_intra_linked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UpdateProfileRequest(BaseModel):
    bio: str = Field(max_length=500)


class GdprErasureOut(BaseModel):
    """Counts of rows removed when the account is erased (GDPR)."""

    deleted: bool = True
    api_keys: int
    events: int
    notifications: int
    friendships: int
    blocks: int
    messages: int
    conversation_reads: int
    conversations: int
    user: int
