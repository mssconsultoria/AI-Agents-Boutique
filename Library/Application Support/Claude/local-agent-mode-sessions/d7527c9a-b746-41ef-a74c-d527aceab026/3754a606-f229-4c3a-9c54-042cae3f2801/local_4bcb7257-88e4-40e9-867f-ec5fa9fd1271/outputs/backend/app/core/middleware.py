"""Rate limiting and HTTPS redirect middleware."""
import time
from collections import defaultdict
from typing import Dict, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse as StarletteRedirect

from app.core.config import settings

# Rate limit rules: (path_prefix, method) -> max requests per minute
RATE_LIMITS: Dict[Tuple[str, str], int] = {
    ("/api/v1/leads", "POST"): 10,
    ("/api/v1/auth/login", "POST"): 5,
}

# In-memory store: key = (ip, path_prefix, method) -> list of timestamps
_request_log: Dict[Tuple[str, str, str], list] = defaultdict(list)


def _cleanup_old_entries(key: Tuple[str, str, str], now: float) -> None:
    """Remove timestamps older than 60 seconds."""
    cutoff = now - 60
    entries = _request_log[key]
    _request_log[key] = [ts for ts in entries if ts > cutoff]


def _check_rate_limit(ip: str, path: str, method: str) -> bool:
    """Return True if the request should be allowed, False if rate-limited."""
    now = time.time()
    for (prefix, m), limit in RATE_LIMITS.items():
        if path.startswith(prefix) and method.upper() == m:
            key = (ip, prefix, m)
            _cleanup_old_entries(key, now)
            if len(_request_log[key]) >= limit:
                return False
            _request_log[key].append(now)
            return True
    return True  # No rate limit for this endpoint


def clear_rate_limit_store() -> None:
    """Clear the in-memory rate limit store (useful for tests)."""
    _request_log.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        method = request.method

        if not _check_rate_limit(ip, path, method):
            return Response(
                content="Too Many Requests",
                status_code=429,
                media_type="text/plain",
            )

        return await call_next(request)


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if settings.environment == "production":
            proto = request.headers.get("x-forwarded-proto", "https")
            if proto == "http":
                url = request.url.replace(scheme="https")
                return StarletteRedirect(url=str(url), status_code=301)

        return await call_next(request)
