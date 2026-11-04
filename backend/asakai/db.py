"""PostgreSQL access via psycopg2 with a small thread-safe pool.

Fail-safe: if DATABASE_URL is empty or the server is unreachable, `available()` is False
and callers fall back to demo behaviour instead of crashing. Reconnection is retried
at most every 30 seconds.
"""
import logging
import time
from contextlib import contextmanager
from pathlib import Path

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool

from .config import settings

log = logging.getLogger("asakai.db")
_pool: ThreadedConnectionPool | None = None
_last_try = 0.0
RETRY_SECONDS = 30


def _connect() -> None:
    global _pool, _last_try
    if _pool or not settings.database_url:
        return
    if time.time() - _last_try < RETRY_SECONDS:
        return
    _last_try = time.time()
    try:
        _pool = ThreadedConnectionPool(1, 10, settings.database_url, connect_timeout=5)
        log.info("PostgreSQL connected")
        init_schema()
    except Exception as exc:  # noqa: BLE001
        _pool = None
        log.warning("PostgreSQL unavailable: %s", exc)


def available() -> bool:
    _connect()
    return _pool is not None


@contextmanager
def cursor():
    """Yields a RealDictCursor; commits on success, rolls back on error."""
    global _pool
    if not available():
        raise RuntimeError("database not available")
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except psycopg2.OperationalError:
        conn.rollback()
        _pool.putconn(conn, close=True)
        conn = None
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        if conn is not None:
            _pool.putconn(conn)


def init_schema() -> None:
    sql = (Path(__file__).resolve().parent.parent / "schema.sql").read_text(encoding="utf-8")
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        _pool.putconn(conn)


def status() -> str:
    if not settings.database_url:
        return "not configured"
    return "connected" if available() else "unreachable"
