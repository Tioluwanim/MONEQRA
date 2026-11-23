from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def uuid_pk() -> uuid.UUID:
    return uuid.uuid4()


class Organisation(Base):
    __tablename__ = "organisations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    opening_available_kobo: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )
    opening_currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="NGN",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    __table_args__ = (
        CheckConstraint(
            "opening_available_kobo >= 0",
            name="ck_organisations_opening_available_kobo",
        ),
        CheckConstraint(
            "length(opening_currency) = 3",
            name="ck_organisations_opening_currency_code",
        ),
    )
