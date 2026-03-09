"""
Rate limiting por IP.
Usa Redis quando disponível (produção com múltiplos workers).
Fallback para dicionário em memória (desenvolvimento).
"""

import logging
import time
from collections import defaultdict

from fastapi import Request, HTTPException, status

logger = logging.getLogger(__name__)

# Redis client singleton (lazy init)
_redis_client = None
_redis_unavailable = False


async def _get_redis():
    """Obter cliente Redis (lazy init, singleton)."""
    global _redis_client, _redis_unavailable
    if _redis_unavailable:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        from backend.core.config import settings
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await _redis_client.ping()
        logger.info("Rate limiter: usando Redis")
        return _redis_client
    except (ImportError, ConnectionError, OSError) as e:
        _redis_unavailable = True
        logger.info("Rate limiter: Redis indisponível, usando fallback em memória: %s", e)
        return None


class RateLimiter:
    """Rate limiter por IP com janela deslizante (Redis ou in-memory)."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._prefix = f"rl:{max_requests}:{window_seconds}"
        # In-memory fallback
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup_memory(self, ip: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

    async def _check_redis(self, ip: str, r) -> bool:
        """Check rate limit via Redis sorted set. Returns True if allowed."""
        key = f"{self._prefix}:{ip}"
        now = time.time()
        cutoff = now - self.window_seconds

        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, cutoff)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()

        count = results[1]
        if count >= self.max_requests:
            # Remove the entry we just added
            await r.zrem(key, str(now))
            return False
        return True

    async def check(self, request: Request) -> None:
        ip = self._get_client_ip(request)

        r = await _get_redis()
        if r is not None:
            try:
                if not await self._check_redis(ip, r):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Muitas tentativas. Tente novamente em {self.window_seconds} segundos.",
                        headers={"Retry-After": str(self.window_seconds)},
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Rate limiter: erro Redis, usando fallback: %s", e)

        # In-memory fallback
        self._cleanup_memory(ip)
        if len(self._requests[ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Muitas tentativas. Tente novamente em {self.window_seconds} segundos.",
                headers={"Retry-After": str(self.window_seconds)},
            )
        self._requests[ip].append(time.time())

    def reset(self) -> None:
        """Clear all tracked requests. Intended for use in tests."""
        self._requests.clear()


# Instancias pre-configuradas
auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
login_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
