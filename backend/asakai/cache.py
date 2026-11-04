"""Cache that never breaks a request: every failure is logged and treated as a miss.

Redis when configured and reachable; otherwise a small in-process TTL cache so repeated
requests from many boards still don't hit the database each time.
"""
import hashlib
import json
import logging
import time

from .config import settings

log = logging.getLogger("asakai.cache")
_client = None
_down_until = 0.0
COOLDOWN = 30

_mem: dict[str, tuple[float, str]] = {}
MEM_MAX = 512


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


def _mem_get(key: str):
    hit = _mem.get(key)
    if not hit:
        return None
    if hit[0] < time.time():
        _mem.pop(key, None)
        return None
    return hit[1]


def _mem_set(key: str, raw: str, ttl: int) -> None:
    if len(_mem) >= MEM_MAX:
        now = time.time()
        for k in [k for k, (exp, _) in list(_mem.items()) if exp < now]:
            _mem.pop(k, None)
        while len(_mem) >= MEM_MAX:
            _mem.pop(next(iter(_mem)), None)
    _mem[key] = (time.time() + ttl, raw)


def get_json(key: str):
    r = _get()
    try:
        raw = r.get(key) if r is not None else _mem_get(key)
        return json.loads(raw) if raw else None
    except Exception as exc:  # noqa: BLE001
        _fail(exc)
        return None


def set_json(key: str, value, ttl: int | None = None) -> None:
    raw = json.dumps(value, default=str)
    ttl = ttl or settings.cache_ttl
    r = _get()
    if r is None:
        _mem_set(key, raw, ttl)
        return
    try:
        r.setex(key, ttl, raw)
    except Exception as exc:  # noqa: BLE001
        _fail(exc)
        _mem_set(key, raw, ttl)


def delete_prefix(prefix: str) -> None:
    for k in [k for k in list(_mem) if k.startswith(prefix)]:
        _mem.pop(k, None)
    r = _get()
    if r is None:
        return
    try:
        for k in r.scan_iter(f"{prefix}*"):
            r.delete(k)
    except Exception as exc:  # noqa: BLE001
        _fail(exc)


def etag_of(value) -> str:
    """Strong ETag for a JSON-serialisable payload (lets clients revalidate with a 304)."""
    raw = json.dumps(value, sort_keys=True, default=str).encode()
    return '"' + hashlib.blake2b(raw, digest_size=12).hexdigest() + '"'


def status() -> str:
    if not settings.redis_url:
        return "memory"
    return "connected" if _get() is not None else "unreachable (memory)"
