"""Create the initial organisation and payment tables.

Revision ID: 20261120_1004
Revises:
Create Date: 2026-11-20 10:04:00

"""

from alembic import op

from app.db.base import Base
from app.db import Organisation, InfraNode, Payment, PaymentEvent  # noqa: F401


revision = "20261120_1004"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    pass
