"""Add configurable obligation priority and responsible person.

Revision ID: 20261126_2210
Revises: 20261126_2200
Create Date: 2026-11-26 22:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20261126_2210"
down_revision = "20261126_2200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {c["name"] for c in inspector.get_columns("obligations")}
    if "priority" not in existing:
        op.add_column(
            "obligations",
            sa.Column(
                "priority",
                sa.String(),
                nullable=False,
                server_default="normal",
            ),
        )
    if "responsible_person" not in existing:
        op.add_column(
            "obligations",
            sa.Column("responsible_person", sa.String(), nullable=True),
        )

    constraints = {
        c["name"] for c in inspector.get_check_constraints("obligations")
    }
    if "ck_obligations_priority" not in constraints:
        op.create_check_constraint(
            "ck_obligations_priority",
            "obligations",
            "priority IN ('critical', 'high', 'normal', 'low')",
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {c["name"] for c in inspector.get_columns("obligations")}
    constraints = {c["name"] for c in inspector.get_check_constraints("obligations")}
    if "ck_obligations_priority" in constraints:
        op.drop_constraint(
            "ck_obligations_priority",
            "obligations",
            type_="check",
        )
    if "responsible_person" in existing:
        op.drop_column("obligations", "responsible_person")
    if "priority" in existing:
        op.drop_column("obligations", "priority")
