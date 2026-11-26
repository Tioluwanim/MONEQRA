"""Obligation categories and coordination actions.

Revision ID: 20261126_1000
Revises: 20261123_1100
Create Date: 2026-11-26 10:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261126_1000"
down_revision = "20261123_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Earlier revisions build tables from the current models, so a fresh database may
    # already have all of this. Only add what is missing.
    inspector = sa.inspect(op.get_bind())
    existing = {c["name"] for c in inspector.get_columns("obligations")}
    if "category" not in existing:
        op.add_column("obligations", sa.Column("category", sa.String(), nullable=False, server_default="other"))
    if "counterparty" not in existing:
        op.add_column("obligations", sa.Column("counterparty", sa.String(), nullable=True))
    if "coordination_actions" not in inspector.get_table_names():
        op.create_table(
            "coordination_actions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("obligation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("obligations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("kind", sa.String(), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("proposed_amount_kobo", sa.BigInteger(), nullable=True),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("requested_by", sa.String(), nullable=False),
            sa.Column("decided_by", sa.String(), nullable=True),
            sa.Column("decision_reason", sa.Text(), nullable=True),
            sa.Column("outcome_note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("simulated", sa.Boolean(), nullable=False),
            sa.CheckConstraint("kind IN ('request_extension', 'split_payment', 'pay_from_confirmed_first')", name="ck_coordination_actions_kind"),
            sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'completed')", name="ck_coordination_actions_status"),
            sa.CheckConstraint("proposed_amount_kobo IS NULL OR proposed_amount_kobo > 0", name="ck_coordination_actions_amount_positive"),
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "coordination_actions" in inspector.get_table_names():
        op.drop_table("coordination_actions")
    existing = {c["name"] for c in inspector.get_columns("obligations")}
    for col in ("counterparty", "category"):
        if col in existing:
            op.drop_column("obligations", col)
