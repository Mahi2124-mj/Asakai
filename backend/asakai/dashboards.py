"""Dashboard data service.

Resolution order for GET /api/dashboards/{key}:
  1. Cache (Redis, or in-process when Redis is absent); concurrent misses for the same
     key + filters are collapsed into one computation
  2. A registered SQL provider for the key (see `provider` below) — real plant data
  3. The latest JSON snapshot in `dashboard_snapshots` (pushed by an ETL / other system)
  4. Bundled demo data (demo_data.json, exported from the app) unless DATA_MODE=live
"""
import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from . import cache, db
from .config import settings

log = logging.getLogger("asakai.dashboards")

_DEMO_FILE = Path(__file__).resolve().parent / "demo_data.json"
_demo: dict = json.loads(_DEMO_FILE.read_text(encoding="utf-8")) if _DEMO_FILE.exists() else {}

KEYS = list(_demo.keys())

# key -> function(filters: dict) -> dict (same shape as the demo data for that key)
_providers: dict[str, Callable[[dict], dict]] = {}


def provider(key: str):
    """Register a live-data function for a dashboard.

    Providers live in asakai/providers.py; return None when the source is unavailable. Example:

        @provider("dispatch")
        def dispatch(filters):
            if not db.available():
                return None
            with db.cursor() as cur:
                cur.execute("SELECT plan, actual FROM dispatch_schedule WHERE item='SEAT SLIDER' AND day=%s",
                            (filters.get("date"),))
                r = cur.fetchone()
            return {"seatSlider": [{"name": "", "plan": r["plan"], "actual": r["actual"],
                                    "gap": r["actual"] - r["plan"]}], ...}
    """

    def wrap(fn):
        _providers[key] = fn
        return fn

    return wrap


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
MAX_FILTERS = 12
MAX_VALUE_LEN = 80


def _lock_for(ck: str) -> threading.Lock:
    with _locks_guard:
        lk = _locks.get(ck)
        if lk is None:
            if len(_locks) > 2048:
                _locks.clear()
            lk = _locks[ck] = threading.Lock()
        return lk


def known(key: str) -> bool:
    return key in _demo or key in _providers


def clean_filters(key: str, filters: dict) -> dict:
    """Keep only the slicers the dashboard has (exported with the demo data), bounded in size,
    so arbitrary query strings can't multiply cache entries or reach providers."""
    allowed = _demo.get(key, {}).get("filters")
    out = {}
    for k, v in sorted(filters.items()):
        if allowed is not None and k not in allowed:
            continue
        out[k] = str(v)[:MAX_VALUE_LEN]
        if len(out) >= MAX_FILTERS:
            break
    return out


def get(key: str, filters: dict) -> dict:
    """Resolved payload incl. an "etag" for conditional GETs. KeyError for unknown dashboards."""
    if not known(key):
        raise KeyError(key)
    filters = clean_filters(key, filters)
    ck = f"asakai:dash:{key}:{json.dumps(filters, sort_keys=True)}"
    hit = cache.get_json(ck)
    if hit:
        return hit
    with _lock_for(ck):
        hit = cache.get_json(ck)
        if hit:
            return hit
        result = _resolve(key, filters)
        result["etag"] = cache.etag_of(result.get("data"))
        cache.set_json(ck, result)
        return result


def _resolve(key: str, filters: dict) -> dict:
    result = None
    if key in _providers:
        # A provider checks its own database and returns None when it can't answer.
        try:
            data = _providers[key](filters)
            if data is not None:
                result = {"data": data, "source": "server", "updated_at": _now()}
        except Exception as exc:  # noqa: BLE001
            log.exception("provider %s failed: %s", key, exc)

    if result is None and db.available():
        try:
            with db.cursor() as cur:
                cur.execute("SELECT data, updated_at FROM dashboard_snapshots WHERE dashboard_key=%s", (key,))
                row = cur.fetchone()
            if row:
                result = {"data": row["data"], "source": "snapshot", "updated_at": row["updated_at"].isoformat()}
        except Exception as exc:  # noqa: BLE001
            log.warning("snapshot read failed for %s: %s", key, exc)

    if result is None:
        if settings.data_mode == "live":
            raise LookupError(f"No live data for dashboard '{key}'")
        if key not in _demo:
            raise KeyError(key)
        result = {"data": _demo[key]["data"], "source": "demo", "updated_at": _now()}

    result["key"] = key
    return result


def save_snapshot(key: str, data: dict, username: str) -> None:
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO dashboard_snapshots (dashboard_key, data, updated_at, updated_by)
               VALUES (%s, %s::jsonb, NOW(), %s)
               ON CONFLICT (dashboard_key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW(), updated_by=EXCLUDED.updated_by""",
            (key, json.dumps(data), username),
        )
        cur.execute("INSERT INTO audit_log (username, action, detail) VALUES (%s, 'snapshot', %s)", (username, key))
    cache.delete_prefix(f"asakai:dash:{key}:")


def schema_of(key: str) -> dict:
    """Describes the JSON the app expects for a dashboard, derived from the demo payload."""

    def describe(v):
        if isinstance(v, list):
            return [describe(v[0])] if v else []
        if isinstance(v, dict):
            return {k: describe(x) for k, x in v.items()}
        return type(v).__name__

    return describe(_demo[key]["data"]) if key in _demo else {}


def catalog() -> list[dict]:
    return [{"key": k, "title": v.get("title", k)} for k, v in _demo.items()]
