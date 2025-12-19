import os
from typing import List, Union, Optional, Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, validator, Field

class Settings(BaseSettings):
    project_name: str = "LogiSnap WMS API"
    api_v1_str: str = "/api"
    
    # שימוש נכון ב-Pydantic V2 - בלי class Config מתנגש
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    
    # DATABASE
    postgres_server: str = Field(default="localhost", alias="POSTGRES_SERVER")
    postgres_user: str = Field(default="logisnap", alias="POSTGRES_USER")
    postgres_password: str = Field(default="logisnap_dev_password", alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="logisnap", alias="POSTGRES_DB")
    
    # Computed database URL
    # הוגדר ל-localhost:5435 עבור הרצה לוקאלית. בדוקר זה יידרס ע"י משתני סביבה וזה תקין.
    database_url: str = "postgresql+asyncpg://logisnap:logisnap_dev_password@localhost:5435/logisnap"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = Field(default="super-secret-key-please-change", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expiration_minutes: int = Field(default=60 * 24, alias="JWT_EXPIRATION_MINUTES")

    # CORS
    backend_cors_origins: List[AnyHttpUrl] = Field(default=[], alias="BACKEND_CORS_ORIGINS")
    
    api_title: str = "LogiSnap API"
    api_version: str = "1.0.0"

    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @validator("database_url", pre=True, always=True)
    def assemble_db_url(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if isinstance(v, str) and v:
            return v
        
        return f"postgresql+asyncpg://{values.get('postgres_user')}:{values.get('postgres_password')}@{values.get('postgres_server')}/{values.get('postgres_db')}"

settings = Settings()