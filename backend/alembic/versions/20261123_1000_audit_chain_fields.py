"""Add previous hash and sequence number to audit events.

Revision ID: 20261123_1000
Revises: 20261123_0913
Create Date: 2026-11-23 10:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20261123_1000"
down_revision = "20261123_0913"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Revision 20261123_0913 builds tables from the current models, so on a fresh
    # database these columns may already exist. Only add what is missing.
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("audit_events")}
    if "previous_hash" not in existing:
        op.add_column("audit_events", sa.Column("previous_hash", sa.String(), nullable=True))
    if "sequence_number" not in existing:
        op.add_column(
            "audit_events",
            sa.Column("sequence_number", sa.BigInteger(), nullable=False, server_default="1"),
        )
        op.alter_column("audit_events", "sequence_number", server_default=None)


def downgrade() -> None:
    op.drop_column("audit_events", "sequence_number")
    op.drop_column("audit_events", "previous_hash")
