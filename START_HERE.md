# Start here: run the platform on your computer

This folder has two parts that run together:

- `eudr_core/`: the backend (FastAPI + Postgres/PostGIS), port 8000
- `eudr_web/`: the web dashboard (Next.js), port 3000

You need Python 3.11+, Node.js 20+, and Postgres 16 with PostGIS (pgAdmin).

## 1. Database (pgAdmin)

In pgAdmin open Query Tool on `eudr_core`, then **File → Open** each file below and press **F5**. Each is safe to run twice.

1. `eudr_core/migrations/001_auth_and_dashboard.sql` (if you haven't already)
2. `eudr_core/migrations/002_deforestation_screening.sql` (new: deforestation screening)

Starting fresh instead? Create database `eudr_core` and run `eudr_core/schema.sql` only.

## 2. Backend (PowerShell window 1)

```powershell
cd C:\Users\User\Downloads\eudr_core_service_2\eudr_core
python -m venv venv                       # skip if venv already exists
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

In `.env` (copy from `.env.example` if you don't have one) set:

- `EUDR_DATABASE_URL`: your Postgres password
- `EUDR_JWT_SECRET`: a long random string
- Deforestation screening, pick one:
  - Real: `EUDR_SCREENING_PROVIDER=whisp` and `EUDR_WHISP_API_KEY=...` (sign in at whisp.openforis.org and create a key on your account page)
  - Demo without a key: `EUDR_SCREENING_PROVIDER=demo` (results are labelled DEMO and must not go to buyers)

```powershell
.\venv\Scripts\python.exe -m scripts.seed_demo        # optional demo company
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

http://127.0.0.1:8000/health should show `{"status":"ok"}`.

## 3. Web dashboard (PowerShell window 2)

```powershell
cd C:\Users\User\Downloads\eudr_core_service_2\eudr_web
npm.cmd install          # run again after every update: new packages were added
npm.cmd run dev
```

Open http://localhost:3000 and sign in (`demo@eudr.ng` / `demo-password-2026` for the demo company), or create your own company.

Press **Ctrl+K** anywhere to search farmers, farms, shipments and pages.

## 4. The full flow

Farmers → Register farmer → Add farm (draw the boundary) → **Screen this plot** →
Harvest and Collection → Batches → Create batch → Shipments → New shipment →
Check readiness → fix what it lists → Re-check → Evidence pack.

## Common snags

- **"Can't reach the server"**: the backend isn't running, or `NEXT_PUBLIC_API_URL` is wrong.
- **`relation "farm_screenings" does not exist`**: run migration 002 (step 1).
- **Screening button says to turn it on**: set `EUDR_SCREENING_PROVIDER` in `.env` and restart the backend.
- **Whisp says the key is wrong or expired**: keys last 365 days; create a new one on whisp.openforis.org.
- **Grey maps**: map tiles load from the internet; check your connection.
