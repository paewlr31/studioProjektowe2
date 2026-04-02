from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    max_agents: int = 50
    feed_size: int = 30
    memory_size: int = 20

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
