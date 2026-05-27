from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    max_agents: int = 50
    feed_size: int = 30
    memory_size: int = 20
    influence_rate: float = 0.15
    topic_expression_ratio: float = 0.7
    max_energy: int = 100
    energy_regen: int = 25
    post_energy_cost: int = 35
    comment_energy_cost: int = 15
    like_energy_cost: int = 5
    ignore_energy_cost: int = 0

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
