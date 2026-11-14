"""
Bring any database up to date. Run this after every update:

    python -m scripts.migrate

- Empty database: builds everything from scratch.
- Database set up earlier by running schema.sql / migrations/*.sql by hand:
  marks it as being at the baseline, then applies only what's new.
- Already managed by Alembic: applies new migrations, if any.

Works the same against local Postgres and Neon (set EUDR_DATABASE_URL or
DATABASE_URL to the Neon connection string, the *unpooled* one).
"""
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.database import resolve_database_url

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    url = resolve_database_url()
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    engine = create_engine(url)
    tables = set(inspect(engine).get_table_names())
    engine.dispose()
    host = url.split("@")[-1].split("/")[0]
    if "alembic_version" not in tables and "organizations" in tables:
        print(f"Existing database at {host}: marking it as baseline.")
        command.stamp(cfg, "0001_baseline")
    print(f"Upgrading {host} ...")
    command.upgrade(cfg, "head")
    print("Database is up to date.")


if __name__ == "__main__":
    main()
