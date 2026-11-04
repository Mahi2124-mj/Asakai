"""asakai — e-Asakai Board API server.

Run:  uvicorn asakai.main:app --host 0.0.0.0 --port 8000
"""
import logging

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from . import __version__, cache, dashboards, db, maint, providers, security  # noqa: F401  (providers register)
from .config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="asakai", version=__version__, description="e-Asakai Board API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "If-None-Match"],
    expose_headers=["ETag"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.on_event("startup")
def startup() -> None:
    if db.available():
        security.ensure_admin()


def _conditional(request: Request, result: dict, max_age: int) -> Response:
    """200 with an ETag, or 304 when the client already has this exact payload."""
    etag = result.get("etag") or cache.etag_of(result)
    headers = {"ETag": etag, "Cache-Control": f"private, max-age={max_age}, must-revalidate"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    body = {k: v for k, v in result.items() if k != "etag"}
    return JSONResponse(jsonable_encoder(body), headers=headers)


class LoginIn(BaseModel):
    username: str
    password: str


@app.get("/api/health")
def health():
    return {
        "service": "asakai",
        "version": __version__,
        "database": db.status(),
        "maintenance": maint.status(),
        "cache": cache.status(),
        "mode": settings.data_mode,
        "dashboards": len(dashboards.KEYS),
    }


@app.post("/api/auth/login")
def login(body: LoginIn):
    user = security.authenticate(body.username.strip(), body.password)
    if not user:
        raise HTTPException(401, "Invalid username or password")
    return {"access_token": security.create_token(user), "token_type": "bearer", "user": user}


@app.get("/api/auth/me")
def me(user: dict = Depends(security.current_user)):
    return user


@app.get("/api/dashboards")
def list_dashboards(_: dict = Depends(security.current_user)):
    return dashboards.catalog()


@app.get("/api/dashboards/{key}")
def get_dashboard(key: str, request: Request, _: dict = Depends(security.current_user)):
    filters = {k: v for k, v in request.query_params.items() if v and v != "All"}
    try:
        return _conditional(request, dashboards.get(key, filters), max_age=0)
    except KeyError:
        raise HTTPException(404, f"Unknown dashboard '{key}'") from None
    except LookupError as exc:
        raise HTTPException(503, str(exc)) from None


@app.get("/api/dashboards/{key}/schema")
def dashboard_schema(key: str, _: dict = Depends(security.current_user)):
    return dashboards.schema_of(key)


@app.post("/api/dashboards/{key}/snapshot")
def push_snapshot(key: str, data: dict = Body(...), user: dict = Depends(security.require_role("admin", "editor"))):
    if not dashboards.known(key):
        raise HTTPException(404, f"Unknown dashboard '{key}'")
    if not db.available():
        raise HTTPException(503, "Database not available")
    dashboards.save_snapshot(key, data, user["username"])
    return {"ok": True, "key": key}


@app.get("/api/masters/machines")
def machine_master(request: Request, _: dict = Depends(security.current_user)):
    """Active machines from maintenance_db.maintenance_machines as [zone, line, machine_no, machine_name] rows."""
    result = maint.machines()
    if result is None:
        detail = "not configured" if maint.status() == "not configured" else "query failed (check SELECT permission)"
        raise HTTPException(503, f"Machine master unavailable: maintenance DB {detail}")
    return _conditional(request, result, max_age=3600)
