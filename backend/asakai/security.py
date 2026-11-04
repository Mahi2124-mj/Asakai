from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import db
from .config import settings

ALGO = "HS256"
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


# Used for login when no database is configured.
_ADMIN_HASH = hash_password(settings.admin_password)


def create_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["username"],
        "name": user.get("full_name") or user["username"],
        "role": user.get("role", "viewer"),
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expire_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def authenticate(username: str, password: str) -> dict | None:
    if db.available():
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, username, full_name, password_hash, role FROM users WHERE username=%s AND is_active",
                (username,),
            )
            row = cur.fetchone()
            if not row or not verify_password(password, row["password_hash"]):
                return None
            cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s", (row["id"],))
            return {"username": row["username"], "full_name": row["full_name"], "role": row["role"]}
    if username == settings.admin_username and verify_password(password, _ADMIN_HASH):
        return {"username": username, "full_name": "Administrator", "role": "admin"}
    return None


def ensure_admin() -> None:
    """Create the bootstrap admin when the users table is empty."""
    if not db.available():
        return
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM users")
        if cur.fetchone()["n"] == 0:
            cur.execute(
                "INSERT INTO users (username, full_name, password_hash, role) VALUES (%s, %s, %s, 'admin')",
                (settings.admin_username, "Administrator", hash_password(settings.admin_password)),
            )


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        p = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=[ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please login again") from None
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from None
    return {"username": p["sub"], "full_name": p.get("name"), "role": p.get("role", "viewer")}


def require_role(*roles: str):
    def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
        return user

    return dep
