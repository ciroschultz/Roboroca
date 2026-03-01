"""
Rate limiting simples baseado em IP.
Usa dicionario em memoria (adequado para single-instance).
Para producao com multiplas instancias, usar Redis.
"""

import time
from collections import defaultdict
from fastapi import Request, HTTPException, status


class RateLimiter:
    """Rate limiter por IP com janela deslizante."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, ip: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

    def check(self, request: Request) -> None:
        ip = self._get_client_ip(request)
        self._cleanup(ip)

        if len(self._requests[ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Muitas tentativas. Tente novamente em {self.window_seconds} segundos.",
                headers={"Retry-After": str(self.window_seconds)},
            )

        self._requests[ip].append(time.time())


# Instancias pre-configuradas
auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
login_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
