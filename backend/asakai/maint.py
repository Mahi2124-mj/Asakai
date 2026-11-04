"""Read-only access to the plant maintenance database (maintenance_db).

Machine master for the Zone / Line / Machine No. slicers, and a cursor for providers (the
Maintenance Asakai dashboard). The connection is opened read-only with a statement timeout.
Fail-safe like db.py: no URL or an unreachable server -> available() is False.
"""
import logging
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool

from . import cache
from .config import settings

log = logging.getLogger("asakai.maint")
_pool: ThreadedConnectionPool | None = None
_last_try = 0.0
_lock = threading.Lock()
RETRY_SECONDS = 30
CACHE_KEY = "asakai:master:machines"

SQL_MACHINES = """
SELECT zone_name, line_name, machine_no, machine_name
FROM maintenance_machines
WHERE is_active AND (obsolete_date IS NULL OR obsolete_date > CURRENT_DATE)
ORDER BY zone_name, line_name, serial_no NULLS LAST, machine_no
"""


def _connect() -> None:
    global _pool, _last_try
    if _pool or not settings.maint_database_url or time.time() - _last_try < RETRY_SECONDS:
        return
    _last_try = time.time()
    try:
        _pool = ThreadedConnectionPool(
            1, 4, settings.maint_database_url, connect_timeout=5, application_name="asakai",
            options="-c default_transaction_read_only=on -c statement_timeout=5000",
        )
        log.info("Maintenance DB connected")
    except Exception as exc:  # noqa: BLE001
        _pool = None
        log.warning("Maintenance DB unavailable: %s", exc)


def available() -> bool:
    _connect()
    return _pool is not None


@contextmanager
def cursor():
    """RealDictCursor on a read-only transaction (always rolled back). LookupError if unavailable."""
    if not available():
        raise LookupError(f"Maintenance DB {status()}")
    conn = _pool.getconn()
    close = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
    except psycopg2.OperationalError:
        close = True
        raise
    finally:
        if not close:
            conn.rollback()
        _pool.putconn(conn, close=close)


def _query(sql: str) -> list | None:
    try:
        with cursor() as cur:
            cur.execute(sql)
            return [list(r.values()) for r in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001
        log.warning("Maintenance DB query failed: %s", exc)
        return None


def machines() -> dict | None:
    """{"rows": [[zone, line, machine_no, machine_name], ...], "source", "updated_at", "etag"} or None."""
    hit = cache.get_json(CACHE_KEY)
    if hit:
        return hit
    with _lock:
        hit = cache.get_json(CACHE_KEY)
        if hit:
            return hit
        rows = _query(SQL_MACHINES)
        if rows is None:
            return None
        result = {
            "rows": [[str(c).strip() if c is not None else "" for c in r] for r in rows],
            "source": "maintenance_db",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        result["etag"] = cache.etag_of(result["rows"])
        cache.set_json(CACHE_KEY, result, settings.master_cache_ttl)
        return result


def status() -> str:
    if not settings.maint_database_url:
        return "not configured"
    return "connected" if available() else "unreachable"
