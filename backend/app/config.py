import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://moneqra:moneqra@localhost:5432/moneqra",
    )
    simulation_mode: bool = os.getenv("MONEQRA_SIMULATION_MODE", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    webhook_replay_window_seconds: int = int(
        os.getenv("MONEQRA_WEBHOOK_REPLAY_WINDOW_SECONDS", "300")
    )
    token_secret: str = os.getenv("MONEQRA_TOKEN_SECRET", "")
    demo_api_key_secret: str = os.getenv("MONEQRA_DEMO_API_KEY_SECRET", "")
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "MONEQRA_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    )


settings = Settings()