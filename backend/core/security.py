"""
Security utilities - Password hashing and JWT tokens.
"""

import uuid
import time
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core.config import settings

logger = logging.getLogger(__name__)

# Configuracao do hash de senha - usando argon2 (mais seguro e moderno)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# In-memory JWT blacklist (fallback quando Redis nao disponivel)
_blacklisted_tokens: dict[str, float] = {}  # jti -> expiry timestamp
_blacklist_lock = threading.Lock()

# Redis client (inicializado lazy)
_redis_client = None
_redis_available = False


def _get_redis():
    """Obter cliente Redis. Retorna None se indisponivel."""
    global _redis_client, _redis_available
    if _redis_client is not None:
        return _redis_client if _redis_available else None

    try:
        import redis
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_client.ping()
        _redis_available = True
        logger.info("Redis connected for JWT blacklist")
        return _redis_client
    except Exception:
        _redis_client = object()  # Sentinel to avoid retrying
        _redis_available = False
        logger.info("Redis not available, using in-memory JWT blacklist")
        return None


def _cleanup_expired_tokens() -> None:
    """Remove expired tokens from the in-memory blacklist."""
    now = time.time()
    expired = [jti for jti, exp in _blacklisted_tokens.items() if exp < now]
    for jti in expired:
        _blacklisted_tokens.pop(jti, None)


def blacklist_token(jti: str, exp: float) -> None:
    """Add a token's jti to the blacklist until it expires."""
    r = _get_redis()
    if r is not None:
        try:
            ttl = max(1, int(exp - time.time()))
            r.setex(f"bl:{jti}", ttl, "1")
            return
        except Exception:
            pass

    # Fallback in-memory
    with _blacklist_lock:
        _cleanup_expired_tokens()
        _blacklisted_tokens[jti] = exp


def is_token_blacklisted(jti: str) -> bool:
    """Check if a token's jti is blacklisted."""
    r = _get_redis()
    if r is not None:
        try:
            return r.exists(f"bl:{jti}") > 0
        except Exception:
            pass

    # Fallback in-memory
    with _blacklist_lock:
        return jti in _blacklisted_tokens


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar se a senha corresponde ao hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gerar hash da senha."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Criar token JWT."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodificar e validar token JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        # Check if token has been blacklisted (logged out)
        jti = payload.get("jti")
        if jti and is_token_blacklisted(jti):
            return None
        return payload
    except JWTError:
        return None
