"""
Pranjay Backend - Environment Configuration
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Settings
    app_name: str = "Pranjay"
    app_env: str = "development"
    debug: bool = True
    secret_key: str
    api_version: str = "v1"
    
    # Database
    database_url: str
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # OTP
    otp_expire_minutes: int = 10
    otp_length: int = 6
    
    # Email (Resend)
    resend_api_key: str
    email_from: str = "noreply@pranjay.com"
    admin_email: str = "admin@pranjay.com"
    
    # Supabase Storage
    supabase_url: str
    supabase_key: str
    supabase_bucket: str = "products"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
