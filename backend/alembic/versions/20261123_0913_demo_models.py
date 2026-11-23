"""Add demo dependency, incident, obligation, recommendation and audit tables.

Revision ID: 20261123_0913
Revises: 20261120_1004
Create Date: 2026-11-23 09:13:00
"""

from alembic import op

from app.db.base import Base
from app.db import (  # noqa: F401
    Approval,
    AuditEvent,
    DependencyEdge,
    Incident,
    IncidentTransition,
    Obligation,
    Organisation,
    Recommendation,
)


revision = "20261123_0913"
down_revision = "20261120_1004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    pass
