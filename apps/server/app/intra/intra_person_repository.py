from sqlalchemy import select
from sqlalchemy.orm import Session

from app.intra.intra_person_model import IntraPerson


def get_by_forty_two_id(db: Session, forty_two_id: int) -> IntraPerson | None:
    return db.get(IntraPerson, forty_two_id)


def get_by_login(db: Session, login: str) -> IntraPerson | None:
    return db.scalar(select(IntraPerson).where(IntraPerson.login == login))


def upsert_from_intra(
    db: Session,
    *,
    forty_two_id: int,
    login: str,
    display_name: str | None,
    avatar_url: str | None,
    betterintra_user_id: int | None = None,
) -> IntraPerson:
    person = get_by_forty_two_id(db, forty_two_id)
    if person is None:
        person = IntraPerson(
            forty_two_id=forty_two_id,
            login=login,
            display_name=display_name,
            avatar_url=avatar_url,
            betterintra_user_id=betterintra_user_id,
        )
    else:
        person.login = login
        person.display_name = display_name
        person.avatar_url = avatar_url
        if betterintra_user_id is not None:
            person.betterintra_user_id = betterintra_user_id
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def attach_betterintra_user(
    db: Session,
    *,
    forty_two_id: int,
    login: str,
    display_name: str | None,
    avatar_url: str | None,
    user_id: int,
) -> IntraPerson:
    # Clear previous attachment if this user was linked to another Intra identity
    previous = db.scalar(select(IntraPerson).where(IntraPerson.betterintra_user_id == user_id))
    if previous is not None and previous.forty_two_id != forty_two_id:
        previous.betterintra_user_id = None
        db.add(previous)

    return upsert_from_intra(
        db,
        forty_two_id=forty_two_id,
        login=login,
        display_name=display_name,
        avatar_url=avatar_url,
        betterintra_user_id=user_id,
    )
