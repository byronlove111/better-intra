from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Friendship(Base):
    """One-way follow: BetterIntra user → any Intra identity (forty_two_id)."""

    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("follower_id", "following_forty_two_id", name="uq_friendships_follower_target"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    following_forty_two_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("intra_people.forty_two_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
