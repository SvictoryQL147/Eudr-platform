import pytest


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    """Every TestClient request comes from the same address ("testclient"),
    so sign-in failures from earlier runs would trip the per-IP limit.
    Start each test with a clean slate (no-op without a database)."""
    try:
        from sqlalchemy import text

        from app.database import engine

        with engine.begin() as conn:
            conn.execute(text("DELETE FROM login_attempts WHERE ip = 'testclient'"))
    except Exception:
        pass
    yield
