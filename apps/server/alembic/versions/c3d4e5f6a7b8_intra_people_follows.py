"""intra people + friendships Intra-first

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-03 02:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "intra_people",
        sa.Column("forty_two_id", sa.BigInteger(), nullable=False),
        sa.Column("login", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("betterintra_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["betterintra_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("forty_two_id"),
        sa.UniqueConstraint("betterintra_user_id"),
    )
    op.create_index(op.f("ix_intra_people_login"), "intra_people", ["login"], unique=True)

    # Seed Intra identities from already-linked BetterIntra users
    op.execute(
        """
        INSERT INTO intra_people (forty_two_id, login, display_name, avatar_url, betterintra_user_id)
        SELECT forty_two_id, login, display_name, avatar_url, id
        FROM users
        WHERE forty_two_id IS NOT NULL AND login IS NOT NULL
        ON CONFLICT (forty_two_id) DO NOTHING
        """
    )

    op.add_column("friendships", sa.Column("following_forty_two_id", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE friendships AS f
        SET following_forty_two_id = u.forty_two_id
        FROM users AS u
        WHERE f.following_id = u.id AND u.forty_two_id IS NOT NULL
        """
    )
    op.execute("DELETE FROM friendships WHERE following_forty_two_id IS NULL")
    op.alter_column("friendships", "following_forty_two_id", nullable=False)

    op.drop_constraint("uq_friendships_pair", "friendships", type_="unique")
    op.drop_constraint("friendships_following_id_fkey", "friendships", type_="foreignkey")
    op.drop_index("ix_friendships_following_id", table_name="friendships")
    op.drop_column("friendships", "following_id")

    op.create_foreign_key(
        "friendships_following_forty_two_id_fkey",
        "friendships",
        "intra_people",
        ["following_forty_two_id"],
        ["forty_two_id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_friendships_following_forty_two_id"),
        "friendships",
        ["following_forty_two_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_friendships_follower_target",
        "friendships",
        ["follower_id", "following_forty_two_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_friendships_follower_target", "friendships", type_="unique")
    op.drop_index(op.f("ix_friendships_following_forty_two_id"), table_name="friendships")
    op.drop_constraint("friendships_following_forty_two_id_fkey", "friendships", type_="foreignkey")

    op.add_column("friendships", sa.Column("following_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE friendships AS f
        SET following_id = p.betterintra_user_id
        FROM intra_people AS p
        WHERE f.following_forty_two_id = p.forty_two_id
        """
    )
    op.execute("DELETE FROM friendships WHERE following_id IS NULL")
    op.alter_column("friendships", "following_id", nullable=False)
    op.create_foreign_key(
        "friendships_following_id_fkey",
        "friendships",
        "users",
        ["following_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_friendships_following_id", "friendships", ["following_id"], unique=False)
    op.create_unique_constraint("uq_friendships_pair", "friendships", ["follower_id", "following_id"])
    op.drop_column("friendships", "following_forty_two_id")

    op.drop_index(op.f("ix_intra_people_login"), table_name="intra_people")
    op.drop_table("intra_people")
