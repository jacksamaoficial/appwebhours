from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Per client IP. Behind nginx, uvicorn must run with --proxy-headers so the real
# client IP (X-Forwarded-For) is used instead of the proxy's.
limiter = Limiter(key_func=get_remote_address)

# Brute-force protection for the auth endpoints
LOGIN_LIMIT = "10/minute"
REGISTER_LIMIT = "5/hour"
REFRESH_LIMIT = "30/minute"
