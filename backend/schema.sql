-- asakai database schema (PostgreSQL)
-- psql -U postgres -c "CREATE USER asakai WITH PASSWORD 'asakai';"
-- psql -U postgres -c "CREATE DATABASE asakai OWNER asakai;"
-- psql -U asakai -d asakai -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    full_name     VARCHAR(128) NOT NULL DEFAULT '',
    password_hash VARCHAR(128) NOT NULL,
    role          VARCHAR(32)  NOT NULL DEFAULT 'viewer',   -- viewer | editor | admin
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Latest pre-computed payload per dashboard. Any ETL / Power BI export / plant system can
-- push JSON here (POST /api/dashboards/{key}/snapshot); the app reads it as-is.
-- The JSON shape for each dashboard is documented by GET /api/dashboards/{key}/schema
-- (it is the same shape the demo data uses).
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    dashboard_key VARCHAR(64) PRIMARY KEY,
    data          JSONB       NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(64),
    action     VARCHAR(64) NOT NULL,
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
