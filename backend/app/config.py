from pydantic_settings import BaseSettings
from functools import lru_cache
import base64


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    _jwt_secret_raw: str  # Store raw base64
    
    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        """Decode base64 JWT secret to PEM format."""
        try:
            # Try to decode base64
            decoded = base64.b64decode(self._jwt_secret_raw).decode('utf-8')
            return decoded
        except Exception:
            # If not base64, return as-is
            return self._jwt_secret_raw
    
    # App Configuration
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_ENV: str = "development"
    DONATELLO_X_KEY: str = "OUT_TATTOO_SECRET_123"
    
    # CORS Origins - explicit list for credentials support
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "https://out-tattoo-web.vercel.app",
        "https://out-tattoo-leads.vercel.app",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
