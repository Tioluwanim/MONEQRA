from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


engine: Engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


def org_query(session: Session, model: type[Any], org_id: Any) -> Any:
    """Start a query that is always scoped to an organisation."""
    if org_id is None:
        raise ValueError("org_id is required")
    if not hasattr(model, "org_id"):
        raise TypeError(f"{model.__name__} is not organisation-scoped")
    return session.query(model).filter(model.org_id == org_id)
