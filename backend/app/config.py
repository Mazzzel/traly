from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://bot:bot@localhost:5432/trading"

    class Config:
        env_file = ".env"


settings = Settings()
