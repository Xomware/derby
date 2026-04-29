from datetime import datetime
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(default="postgresql+psycopg://derby:derby@localhost:5432/derby")

    jwt_secret: str = Field(default="dev-secret-change-me")
    jwt_algorithm: str = Field(default="HS256")
    session_days: int = Field(default=30)

    app_base_url: str = Field(default="http://localhost:3000")
    api_base_url: str = Field(default="http://localhost:8000")
    cookie_domain: str = Field(default="")
    cookie_secure: bool = Field(default=False)

    resend_api_key: str = Field(default="")
    email_from: str = Field(default="Sun Oracle <noreply@xoware.com>")

    admin_emails: str = Field(default="")

    poll_enabled: bool = Field(default=False)
    poll_window_start_utc: datetime | None = Field(default=None)
    poll_window_end_utc: datetime | None = Field(default=None)
    poll_interval_seconds: int = Field(default=120)
    poll_provider: str = Field(default="fake")

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def cookie_kwargs(self) -> dict:
        kwargs: dict = {
            "httponly": True,
            "samesite": "lax",
            "secure": self.cookie_secure,
            "path": "/",
        }
        if self.cookie_domain:
            kwargs["domain"] = self.cookie_domain
        return kwargs


@lru_cache
def get_settings() -> Settings:
    return Settings()
