from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    coach_api_key: str
    allowed_origins: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()
