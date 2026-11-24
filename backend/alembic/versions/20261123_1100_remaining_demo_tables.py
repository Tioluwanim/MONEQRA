"""Add provider, snapshot and scenario tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261123_1100"
down_revision = "20261123_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provider_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("environment", sa.String(), nullable=False),
        sa.Column("secret_ciphertext", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("org_id", "provider_node_id", "environment", name="uq_provider_credentials_org_provider_environment"),
        sa.CheckConstraint("environment IN ('sandbox', 'live')", name="ck_provider_credentials_environment"),
    )
    op.create_table(
        "provider_signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider_event_id", sa.String(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("latency_ms", sa.BigInteger(), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("org_id", "provider_node_id", "provider_event_id", name="uq_provider_signals_org_provider_event"),
    )
    op.create_table(
        "provider_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("provider_reference", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("response_summary", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "financial_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("opening_available_kobo", sa.BigInteger(), nullable=False),
        sa.Column("settled_kobo", sa.BigInteger(), nullable=False),
        sa.Column("unresolved_kobo", sa.BigInteger(), nullable=False),
        sa.Column("obligations_due_kobo", sa.BigInteger(), nullable=False),
        sa.Column("worst_case_position_kobo", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        sa.CheckConstraint("length(currency) = 3", name="ck_financial_snapshots_currency_code"),
    )
    op.create_table(
        "scenario_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recovery_probability_bps", sa.BigInteger(), nullable=False),
        sa.Column("inputs", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        sa.CheckConstraint("recovery_probability_bps >= 0 AND recovery_probability_bps <= 10000", name="ck_scenario_runs_probability"),
    )


def downgrade() -> None:
    op.drop_table("scenario_runs")
    op.drop_table("financial_snapshots")
    op.drop_table("provider_requests")
    op.drop_table("provider_signals")
    op.drop_table("provider_credentials")
