from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import settings


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
ALEMBIC_DIRECTORY = BACKEND_DIRECTORY / "alembic"
ALEMBIC_INI = BACKEND_DIRECTORY / "alembic.ini"


def get_alembic_config() -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(ALEMBIC_DIRECTORY))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    return config


def upgrade_database(revision: str = "head") -> None:
    command.upgrade(get_alembic_config(), revision)
