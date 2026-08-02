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
    bio: str | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    def is_intra_linked(self) -> bool:
        return self.forty_two_id is not None


class UserProfileOut(BaseModel):
    """Unified BetterIntra + Intra profile (single front call)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr | None = None
    login: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_intra_linked: bool
    intra: IntraProfileOut | None = None
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    bio: str = Field(max_length=500)
