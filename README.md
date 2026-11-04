# e-Asakai Board

Android app (phone + **Android TV**) for the daily Asakai meeting, rebuilt from the
existing Power BI e-Asakai reports, plus the **asakai** API server.

| Part | Stack |
|---|---|
| App (`frontend/`) | React 19 + Vite, Recharts, jsPDF/html2canvas, Capacitor 7 (Android APK) |
| Server (`backend/`) | FastAPI + PostgreSQL (psycopg2) + JWT/bcrypt + Redis cache (fail-safe) |
| CI (`.github/workflows/build-android.yml`) | Builds the Android APK on every push / PR |

**Ready-to-install demo APK:** [`apk/e-Asakai-debug.apk`](apk/e-Asakai-debug.apk) (debug build, built-in demo data).

## What is in the app

Landing (TB Way) → Login → Department portal → dashboards, chained with the yellow **Next** button
exactly like the meeting flow:

Dispatch → Store → HR → Customer Quality → Receiving (BOP child part) Quality → Press Shop → Loop Pipe →
Sub-Assy → Seat Slider → Recliner → Thin Recliner → Maintenance → Die Maintenance → Toolroom →
Quality Circle → Thank You.

Each dashboard has its slicers (Line / Shift / Date / Month / Year / Model …), drill pages as tabs
(Quality, Losses, OITS, Backlog, Pareto …), *Clear all slicers*, PDF export and auto-refresh (5 min).
Dojo, Attendance, B'Day and Sales Forecast are placeholders until their layouts are shared.

### TV mode (86" 1895 × 1096 mm board)

On any landscape screen ≥ 900 px wide (Android TV, tablet, desktop) the app lays every page out on a
fixed 1366 px 16:9 canvas and scales it to the screen, so a whole dashboard is visible without
scrolling — the same idea as Power BI "fit to page". Android TV specifics:

* appears on the TV home screen (LEANBACK launcher + banner), landscape, immersive full screen
* screen is kept awake while the app is open
* works with the remote: arrow keys move focus (yellow ring), OK selects, Back goes back

## Data

The app does not need a server to demo: with no server configured it uses built-in sample data
(footer shows **DEMO DATA**). Set the server in the app (⚙ Settings) or at build time with
`VITE_API_URL`. The server resolves each dashboard in this order:

1. cache (Redis, or in-process when Redis is not set up); simultaneous requests for the same
   dashboard + slicers are answered by a single computation
2. a Python SQL provider registered for that dashboard (`@provider("dispatch")` in `backend/asakai/dashboards.py`)
3. the latest JSON pushed to `dashboard_snapshots` (`POST /api/dashboards/{key}/snapshot`)
4. demo data (unless `DATA_MODE=live`)

`GET /api/dashboards/{key}/schema` shows the JSON shape every dashboard expects. Only a dashboard's
own slicer keys are accepted as filters (exported to `demo_data.json` by `npm run export-demo`).

**Slicer defaults.** Date slicers open on the last working day (Monday shows Saturday); Store uses
the same day as Day / Month / Year. *Clear all slicers* returns to these defaults.

**Maintenance Asakai.** The Maintenance page is the MES Asakai page (`Maintenance_DX`, port 9965):
maintenance ANDON calls, remarks not filled (zone → line), breakdown frequency and hours by line, and
the category-wise breakdown table. `backend/asakai/providers.py` runs the same SQL as
`Maintenance_DX/Phase2/routers/asakai.py`, so the numbers match. Category filters the table on the
device only.

**Machine master.** Zone → Line → Machine No. on Maintenance, Die Maintenance and Toolroom come from
`maintenance_db.maintenance_machines` (active, not obsolete) via `GET /api/masters/machines`.

Both read `maintenance_db` through `MAINT_DATABASE_URL` (read-only, 5 s statement timeout; without it,
demo data). The database user needs `SELECT` on: `maintenance_machines`, `andon_history`,
`andon_system`, `andon_departments`, `andon_remarks_history`, `maintenance_breakdown_data`,
`maintenance_auto_breakdown_slip`.

**Load.** Responses are gzip-compressed and carry an ETag; the app revalidates with `If-None-Match`, so
an unchanged dashboard costs a body-less 304. The app reuses answers for 60 s while moving through
the meeting, cancels requests made stale by a newer slicer choice, skips auto-refresh while hidden,
spreads auto-refresh over 30 s across boards, and keeps the machine master on the device for 12 h.

## Run locally

```bash
# server
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Windows path
cp .env.example .env            # set DATABASE_URL, REDIS_URL, JWT_SECRET, ADMIN_PASSWORD
.venv/Scripts/python -m uvicorn asakai.main:app --host 0.0.0.0 --port 8000

# app (browser)
cd frontend
npm install
npm run dev                      # http://localhost:5173
npm run export-demo              # refresh backend/asakai/demo_data.json from the app's sample data

# Android APK
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug   # app/build/outputs/apk/debug/app-debug.apk
```

Without PostgreSQL the server still runs (demo data, login with `ADMIN_USERNAME`/`ADMIN_PASSWORD`).
With PostgreSQL the schema is created automatically and the admin user is seeded; add users with
`python create_user.py <username> <password> [viewer|editor|admin]`.

## CI secrets (optional)

* variable `ASAKAI_API_URL` – default server baked into the build
* secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` – signed release APK
