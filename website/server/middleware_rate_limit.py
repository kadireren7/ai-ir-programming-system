"""Simple in-memory rate limiting for /api/* (prototype — use Redis in production)."""

from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_calls: int = 120, window_sec: float = 60.0):
        super().__init__(app)
        self.max_calls = max_calls
        self.window_sec = window_sec
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window_start = now - self.window_sec
        bucket = [t for t in self._hits[client] if t > window_start]
        if len(bucket) >= self.max_calls:
            return JSONResponse(
                {"detail": "Rate limit exceeded. Try again shortly."},
                status_code=429,
            )
        bucket.append(now)
        self._hits[client] = bucket
        return await call_next(request)
