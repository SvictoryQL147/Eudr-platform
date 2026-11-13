import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()


def resolve_database_url() -> str:
    """EUDR_DATABASE_URL wins. Otherwise use DATABASE_URL, which the Neon
    integration on Vercel sets automatically. postgres:// and postgresql://
    URLs are converted to the psycopg2 driver SQLAlchemy needs."""
    url = os.environ.get("EUDR_DATABASE_URL") or os.environ.get("DATABASE_URL") or settings.database_url
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg2://" + url[len(prefix):]
    return url


# On Vercel each function instance is short-lived; don't hold a pool of
# idle connections open against the database — let the provider's pooler
# (Neon / Supabase) do the pooling.
_serverless = bool(os.environ.get("VERCEL"))
engine = create_engine(
    resolve_database_url(),
    pool_pre_ping=True,
    future=True,
    **({"poolclass": NullPool} if _serverless else {}),
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
