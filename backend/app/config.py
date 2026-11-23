import os
from dataclasses import dataclass


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


settings = Settings()