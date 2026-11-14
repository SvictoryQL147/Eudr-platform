from alembic import context
from sqlalchemy import create_engine, pool

from app.database import resolve_database_url

config = context.config


def run_migrations_online() -> None:
    engine = create_engine(resolve_database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, transaction_per_migration=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise SystemExit("Offline mode isn't supported; run against a database.")
run_migrations_online()
