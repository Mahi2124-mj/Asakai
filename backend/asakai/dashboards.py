"""Dashboard data service.

Resolution order for GET /api/dashboards/{key}:
  1. Redis cache (fail-safe)
  2. A registered SQL provider for the key (see `provider` below) — real plant data
  3. The latest JSON snapshot in `dashboard_snapshots` (pushed by an ETL / other system)
  4. Bundled demo data (demo_data.json, exported from the app) unless DATA_MODE=live
"""
import json
import logging
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

    Example (put it in asakai/providers.py once the source tables are known):

        @provider("dispatch")
        def dispatch(filters):
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


def get(key: str, filters: dict) -> dict:
    ck = f"asakai:dash:{key}:{json.dumps(filters, sort_keys=True)}"
    hit = cache.get_json(ck)
    if hit:
        return {**hit, "cached": True}

    result = None
    if key in _providers and db.available():
        try:
            result = {"data": _providers[key](filters), "source": "server", "updated_at": _now()}
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
    cache.set_json(ck, result)
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
