from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import UserORM
from app.models.auth import UserRecord


class UserRepository:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session_factory = session_factory

    @staticmethod
    def _to_record(row: UserORM) -> UserRecord:
        return UserRecord(
            user_id=row.user_id,
            email=row.email,
            full_name=row.full_name,
            company_name=row.company_name,
            active_plan=row.active_plan,
            subscription_status=row.subscription_status,
            created_at=row.created_at,
        )

    def create(self, email: str, password: str, full_name: str = "", company_name: str = "") -> UserRecord:
        with self._session_factory() as session:
            row = UserORM(
                user_id=str(uuid4()),
                email=email.lower().strip(),
                hashed_password=hash_password(password),
                full_name=full_name,
                company_name=company_name,
                active_plan="",
                subscription_status="trial",
                created_at=datetime.now(timezone.utc),
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return self._to_record(row)

    def get_by_email(self, email: str) -> UserORM | None:
        with self._session_factory() as session:
            return session.execute(
                select(UserORM).where(UserORM.email == email.lower().strip())
            ).scalar_one_or_none()

    def get_by_id(self, user_id: str) -> UserRecord | None:
        with self._session_factory() as session:
            row = session.get(UserORM, user_id)
            return self._to_record(row) if row else None
