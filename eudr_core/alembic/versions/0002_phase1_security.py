"""Phase 1: one-time auth tokens, login attempts (rate limiting),
append-only audit log, session versioning on users.

Revision ID: 0002_phase1_security
"""
from pathlib import Path

from alembic import op

revision = "0002_phase1_security"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None

SQL = Path(__file__).resolve().parents[2] / "migrations" / "003_phase1_security.sql"


def upgrade() -> None:
    op.get_bind().exec_driver_sql(SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS audit_events_immutable()")
    op.execute("DROP TABLE IF EXISTS audit_events")
    op.execute("DROP TABLE IF EXISTS login_attempts")
    op.execute("DROP TABLE IF EXISTS auth_tokens")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS session_version")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS last_login_at")
