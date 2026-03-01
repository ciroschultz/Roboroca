"""
Security utilities - Password hashing and JWT tokens.
"""

import uuid
import time
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core.config import settings

# Configuração do hash de senha - usando argon2 (mais seguro e moderno)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# In-memory JWT blacklist (cleared on restart — acceptable for MVP without Redis)
_blacklisted_tokens: dict[str, float] = {}  # jti -> expiry timestamp
_blacklist_lock = threading.Lock()


def _cleanup_expired_tokens() -> None:
    """Remove expired tokens from the blacklist."""
    now = time.time()
    expired = [jti for jti, exp in _blacklisted_tokens.items() if exp < now]
    for jti in expired:
        _blacklisted_tokens.pop(jti, None)


def blacklist_token(jti: str, exp: float) -> None:
    """Add a token's jti to the blacklist until it expires."""
    with _blacklist_lock:
        _cleanup_expired_tokens()
        _blacklisted_tokens[jti] = exp


def is_token_blacklisted(jti: str) -> bool:
    """Check if a token's jti is blacklisted."""
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
