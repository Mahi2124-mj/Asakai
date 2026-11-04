"""Create or update an app user.

    python create_user.py <username> <password> [role] [full name]
    role: viewer (default) | editor | admin
"""
import sys

from asakai import db
from asakai.security import hash_password


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    username, password = sys.argv[1], sys.argv[2]
    role = sys.argv[3] if len(sys.argv) > 3 else "viewer"
    full_name = " ".join(sys.argv[4:]) or username
    if not db.available():
        print("Database not available — set DATABASE_URL in .env")
        sys.exit(2)
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO users (username, full_name, password_hash, role) VALUES (%s, %s, %s, %s)
               ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role,
               full_name=EXCLUDED.full_name, is_active=TRUE""",
            (username, full_name, hash_password(password), role),
        )
    print(f"User '{username}' saved with role '{role}'.")


if __name__ == "__main__":
    main()
