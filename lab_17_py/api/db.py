"""SQLite database session and engine for expenses."""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

LAB_ROOT = Path(__file__).resolve().parent.parent
(LAB_ROOT / "data").mkdir(parents=True, exist_ok=True)
# Default to the local pgvector Postgres container used in this repo (`lab_17_py/docker-compose.yml`).
# You can override with DATABASE_URL in `.env`.
DEFAULT_DB = "postgresql+psycopg2://langchain:langchain@127.0.0.1:5432/langchain"


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DB)


class Base(DeclarativeBase):
    pass


engine = create_engine(
    _database_url(),
    connect_args={"check_same_thread": False} if _database_url().startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    (LAB_ROOT / "data").mkdir(parents=True, exist_ok=True)
    from api.models import Expense  # noqa: F401 — register models

    Base.metadata.create_all(bind=engine)
