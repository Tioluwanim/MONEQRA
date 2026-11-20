import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://moneqra:moneqra@localhost:5432/moneqra",
    )


settings = Settings()