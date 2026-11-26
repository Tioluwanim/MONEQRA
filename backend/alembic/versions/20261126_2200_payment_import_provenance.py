"""Add payment CSV import provenance tables.

Revision ID: 20261126_2200
Revises: 20261126_1000
Create Date: 2026-11-26 22:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261126_2200"
down_revision = "20261126_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("row_count", sa.BigInteger(), nullable=False),
        sa.Column("imported_count", sa.BigInteger(), nullable=False),
        sa.Column("duplicate_count", sa.BigInteger(), nullable=False),
        sa.Column("rejected_count", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('completed', 'rejected')", name="ck_payment_imports_status"),
        sa.CheckConstraint("row_count >= 0 AND imported_count >= 0 AND duplicate_count >= 0 AND rejected_count >= 0", name="ck_payment_imports_counts"),
        sa.UniqueConstraint("org_id", "provider_node_id", "sha256", name="uq_payment_imports_org_provider_sha"),
    )
    op.create_index("ix_payment_imports_org_id", "payment_imports", ["org_id"])

    op.create_table(
        "payment_import_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payment_imports.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("row_number", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("raw_row", postgresql.JSONB(), nullable=False),
        sa.Column("outcome", sa.String(), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id", ondelete="RESTRICT")),
        sa.CheckConstraint("outcome IN ('imported', 'duplicate', 'rejected')", name="ck_payment_import_rows_outcome"),
        sa.UniqueConstraint("import_id", "row_number", name="uq_payment_import_rows_import_row"),
    )
    op.create_index("ix_payment_import_rows_org_id", "payment_import_rows", ["org_id"])
    op.create_index("ix_payment_import_rows_import_id", "payment_import_rows", ["import_id"])


def downgrade() -> None:
    op.drop_table("payment_import_rows")
    op.drop_table("payment_imports")
