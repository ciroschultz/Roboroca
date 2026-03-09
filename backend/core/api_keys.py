"""
API Key management - Geracao, hash e validacao de chaves de API.
"""

import hashlib
import secrets
import time
import threading
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.api_key import ApiKey

# In-memory rate limit tracking for API keys
_api_key_requests: dict[str, list[float]] = {}
_api_key_lock = threading.Lock()


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


def _check_api_key_rate_limit(key_hash: str, rate_limit_per_hour: int) -> bool:
    """Verifica rate limit da API key. Retorna True se permitido."""
    if rate_limit_per_hour <= 0:
        return True

    now = time.time()
    cutoff = now - 3600  # 1 hora

    with _api_key_lock:
        requests = _api_key_requests.get(key_hash, [])
        # Limpar requests expirados
        requests = [t for t in requests if t > cutoff]
        if len(requests) >= rate_limit_per_hour:
            _api_key_requests[key_hash] = requests
            return False
        requests.append(now)
        _api_key_requests[key_hash] = requests
        return True


async def validate_api_key(raw_key: str, db: AsyncSession) -> Optional[ApiKey]:
    """
    Validar API key e retornar o registro se valida.
    Atualiza last_used_at. Retorna None se invalida ou rate limited.
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

    # Verificar rate limit
    rate_limit = getattr(api_key, 'rate_limit_per_hour', 0) or 1000
    if not _check_api_key_rate_limit(key_hash, rate_limit):
        # Sinalizar rate limit excedido via atributo especial
        api_key._rate_limited = True
        return api_key

    # Atualizar last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)

    return api_key
