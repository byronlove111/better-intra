from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, computed_field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    forty_two_id: int | None
    login: str | None
    display_name: str | None
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    def is_intra_linked(self) -> bool:
        return self.forty_two_id is not None
