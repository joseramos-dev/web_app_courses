"""Shared rate limiter.

Uses slowapi's in-memory storage, which is per-process: with several uvicorn
workers each one keeps its own counters, so the effective limit is multiplied
by the number of workers. A real deployment should point `storage_uri` at
Redis. For a single-process deployment this is enough to stop password
spraying, mass registration and hammering of the expensive endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import RATE_LIMIT_DEFAULT, RATE_LIMIT_ENABLED

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[RATE_LIMIT_DEFAULT],
    enabled=RATE_LIMIT_ENABLED,
)
