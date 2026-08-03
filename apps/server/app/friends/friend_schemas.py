from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FriendOut(BaseModel):
    """Follow target / follower card. Extra BI fields only when is_betterintra_linked."""

    model_config = ConfigDict(from_attributes=True)

    forty_two_id: int
    login: str
    display_name: str | None = None
    avatar_url: str | None = None
    followed_at: datetime
    is_betterintra_linked: bool
    # Present when the person has a BetterIntra account
    betterintra_user_id: int | None = None
    bio: str | None = None


class FollowListOut(BaseModel):
    items: list[FriendOut]
    count: int


class FollowStatsOut(BaseModel):
    login: str
    forty_two_id: int
    following_count: int = Field(description="How many people this identity follows (0 if no BI account)")
    followers_count: int = Field(description="How many BetterIntra users follow this Intra identity")
    is_following: bool | None = Field(
        default=None,
        description="Whether the current viewer follows this identity (null on own stats)",
    )
    is_betterintra_linked: bool
