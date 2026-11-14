"""Baseline: the full schema as of the deforestation-screening release
(schema.sql). Databases created before Alembic are stamped at this
revision by scripts/migrate.py instead of re-running it.

Revision ID: 0001_baseline
"""
from pathlib import Path

from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None

ROOT = Path(__file__).resolve().parents[2]


def upgrade() -> None:
    op.get_bind().exec_driver_sql((ROOT / "schema.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    raise RuntimeError("The baseline can't be downgraded. Restore from a backup instead.")
