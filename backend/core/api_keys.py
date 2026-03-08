"""
API Key management - Geracao, hash e validacao de chaves de API.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.api_key import ApiKey


def generate_api_key(environment: str = "live") -> tuple[str, str, str]:
    """
    Gerar nova API key.
    Retorna (raw_key, key_hash, prefix).
    """
    prefix = f"rbr_{environment}_"
    random_part = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{random_part}"
    key_hash = hash_api_key(raw_key)
    return raw_key, key_hash, prefix


def hash_api_key(raw_key: str) -> str:
    """Hash SHA-256 da API key."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def validate_api_key(raw_key: str, db: AsyncSession) -> Optional[ApiKey]:
    """
    Validar API key e retornar o registro se valida.
    Atualiza last_used_at.
    """
    key_hash = hash_api_key(raw_key)
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,
        )
    )
    api_key = result.scalar_one_or_none()

    if api_key is None:
        return None

    # Verificar expiracao
    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        return None

    # Atualizar last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)

    return api_key
