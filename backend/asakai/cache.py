"""Redis cache that never breaks a request: every failure is logged and treated as a miss."""
import json
import logging
import time

from .config import settings

log = logging.getLogger("asakai.cache")
_client = None
_down_until = 0.0
COOLDOWN = 30


def _get():
    global _client, _down_until
    if not settings.redis_url or time.time() < _down_until:
        return None
    if _client is None:
        try:
            import redis

            _client = redis.Redis.from_url(settings.redis_url, socket_timeout=1, socket_connect_timeout=1)
            _client.ping()
            log.info("Redis connected")
        except Exception as exc:  # noqa: BLE001
            log.warning("Redis unavailable: %s", exc)
            _client = None
            _down_until = time.time() + COOLDOWN
    return _client


def _fail(exc: Exception) -> None:
    global _client, _down_until
    log.warning("Redis error, disabling cache for %ss: %s", COOLDOWN, exc)
    _client = None
    _down_until = time.time() + COOLDOWN


def get_json(key: str):
    r = _get()
    if r is None:
        return None
    try:
        raw = r.get(key)
        return json.loads(raw) if raw else None
    except Exception as exc:  # noqa: BLE001
        _fail(exc)
        return None


def set_json(key: str, value, ttl: int | None = None) -> None:
    r = _get()
    if r is None:
        return
    try:
        r.setex(key, ttl or settings.cache_ttl, json.dumps(value, default=str))
    except Exception as exc:  # noqa: BLE001
        _fail(exc)


def delete_prefix(prefix: str) -> None:
    r = _get()
    if r is None:
        return
    try:
        for k in r.scan_iter(f"{prefix}*"):
            r.delete(k)
    except Exception as exc:  # noqa: BLE001
        _fail(exc)


def status() -> str:
    if not settings.redis_url:
        return "not configured"
    return "connected" if _get() is not None else "unreachable"
