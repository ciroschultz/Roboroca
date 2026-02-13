"""
Configurações da aplicação.
Carrega variáveis de ambiente e define valores padrão.
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações da aplicação carregadas de variáveis de ambiente."""

    # Informações do Projeto
    PROJECT_NAME: str = "Roboroça"
    DESCRIPTION: str = "Sistema inteligente de análise de imagens aéreas para agricultura - Identificação de plantas, áreas, produtividade e mais"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Ambiente
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Segurança
    SECRET_KEY: str = "your-secret-key-change-in-production-abc123xyz"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias
    ALGORITHM: str = "HS256"

    # Banco de Dados
    # Para desenvolvimento local, usa SQLite por padrão
    # Para produção, usar PostgreSQL: postgresql+asyncpg://user:pass@host:5432/db
    DATABASE_URL: str = "sqlite+aiosqlite:///./roboroca.db"

    # Redis (opcional para desenvolvimento)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend Next.js
        "http://localhost:3001",  # Frontend Next.js (porta alternativa)
        "http://localhost:3002",  # Frontend Next.js (porta alternativa)
        "http://localhost:3003",  # Frontend Next.js (porta alternativa)
        "http://localhost:3004",  # Frontend Next.js (porta alternativa)
        "http://localhost:3005",  # Frontend Next.js (porta alternativa)
        "http://localhost:8000",  # Backend (Swagger)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:8000",
    ]

    # Frontend URL (para links em emails, CORS, etc.)
    FRONTEND_URL: str = "http://localhost:3000"

    # Upload de Arquivos
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".tif", ".tiff", ".jpg", ".jpeg", ".png", ".geotiff"]
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mov", ".mp4", ".avi", ".mkv"]
    ALLOWED_EXTENSIONS: List[str] = [".tif", ".tiff", ".jpg", ".jpeg", ".png", ".geotiff", ".mov", ".mp4", ".avi", ".mkv"]
    UPLOAD_DIR: str = "./uploads"

    # DigitalOcean Spaces (S3-compatible)
    DO_SPACES_KEY: str = ""
    DO_SPACES_SECRET: str = ""
    DO_SPACES_BUCKET: str = "roboroca"
    DO_SPACES_REGION: str = "nyc3"
    DO_SPACES_ENDPOINT: str = "https://nyc3.digitaloceanspaces.com"

    # Machine Learning
    ML_MODELS_DIR: str = "./ml_models"
    DEFAULT_SEGMENTATION_MODEL: str = "unet_landuse"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instância global de configurações
settings = Settings()

# Criar diretório de uploads se não existir
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
