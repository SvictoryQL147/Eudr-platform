# Start here: run Ala Trace on your computer

This folder has two parts that run together:

- `eudr_core/`: the backend (FastAPI + Postgres/PostGIS), port 8000
- `eudr_web/`: the web app (Next.js), port 3000. In development it passes `/api/*` calls to the backend for you, so open only http://localhost:3000.

You need Python 3.11+, Node.js 20+, and Postgres 16 with PostGIS.

## 1. Backend (PowerShell window 1)

```powershell
cd C:\Users\User\Downloads\eudr_core_service_2\eudr_core
python -m venv venv                                   # skip if venv already exists
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

In `.env` (copy from `.env.example` if you don't have one) set at least:

- `EUDR_DATABASE_URL`: your Postgres password
- `EUDR_JWT_SECRET`: a long random string
- Deforestation screening: `EUDR_SCREENING_PROVIDER=whisp` plus `EUDR_WHISP_API_KEY=...`, or `demo` for labelled fake results

Then update the database. **Run this after every update** (it replaces running SQL files in pgAdmin; it knows what your database already has):

```powershell
.\venv\Scripts\python.exe -m scripts.migrate
.\venv\Scripts\python.exe -m scripts.seed_demo        # optional demo company
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

http://127.0.0.1:8000/health/ready should show `"database":"ok"`.

## 2. Web app (PowerShell window 2)

```powershell
cd C:\Users\User\Downloads\eudr_core_service_2\eudr_web
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000 and sign in (`demo@eudr.ng` / `demo-password-2026`), or create a company.

Remove `NEXT_PUBLIC_API_URL` from `eudr_web/.env.local` if you set it before. It must stay empty now, because sessions use a secure cookie that only works on the same address.

## 3. What's new in this update (Phase 1)

- **Sign-in security**: sessions are in an httpOnly cookie (scripts on the page can't read it). After 5 wrong passwords an account locks for 15 minutes. Changing a password signs out every other device.
- **Forgot password and invitations**: Team → Invite member emails a link to set a password. Until email is set up (below), the app shows the link so you can send it yourself, for example on WhatsApp. On your computer, emails are printed in the backend window.
- **Roles that really apply**: admin, staff, compliance reviewer and field agent. The server refuses actions a role can't do, and the app hides those buttons.
- **Activity log**: every create, change, sign-in and readiness check is recorded with who and when. The database refuses to edit or delete entries. See it under Activity, and the History card on each farmer, farm and shipment.
- **Permanent document storage** on Cloudflare R2 or AWS S3 (needed on Vercel).
- **Your account** page: change password, sign out everywhere.
- **Automatic checks on GitHub**: every push runs the 109 backend tests plus the web typecheck and build (`.github/workflows/ci.yml`).

## 4. Going live on Vercel: new settings

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value |
| --- | --- |
| `EUDR_APP_URL` | `https://your-domain` (links in emails point here; it also switches on secure cookies) |
| `EUDR_ENVIRONMENT` | `production` |
| `EUDR_EMAIL_BACKEND` | `resend` |
| `EUDR_RESEND_API_KEY` | from resend.com → API Keys |
| `EUDR_EMAIL_FROM` | `Ala Trace <no-reply@your-domain>` (verify the domain in Resend first) |
| `EUDR_STORAGE_BACKEND` | `s3` |
| `EUDR_S3_BUCKET` | your R2 bucket name, e.g. `ala-trace-documents` |
| `EUDR_S3_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` |
| `EUDR_S3_REGION` | `auto` |
| `EUDR_S3_ACCESS_KEY_ID` / `EUDR_S3_SECRET_ACCESS_KEY` | from R2 → Manage API tokens (Object Read & Write, this bucket only) |
| `EUDR_MAX_UPLOAD_MB` | `4` (Vercel's request size limit) |
| `EUDR_SENTRY_DSN` | optional, from sentry.io → Project → Client Keys |
| `NEXT_PUBLIC_APP_NAME` | `Ala Trace` |

Remove `EUDR_STORAGE_DIR` and any `NEXT_PUBLIC_API_URL`.

Then update the Neon database **from your laptop** (point it at Neon's unpooled URL for this one command):

```powershell
$env:EUDR_DATABASE_URL="postgresql://...neon...?sslmode=require"   # DATABASE_URL_UNPOOLED from Vercel
.\venv\Scripts\python.exe -m scripts.migrate
Remove-Item Env:EUDR_DATABASE_URL
```

For uptime alerts, point a free monitor (Better Stack or UptimeRobot) at `https://your-domain/health/ready`.

## 5. The full flow

Farmers → Register farmer → Add farm (draw the boundary) → **Screen this plot** →
Harvest and Collection → Batches → Create batch → Shipments → New shipment →
Check readiness → fix what it lists → Re-check → Evidence pack.

## Common snags

- **Signed out straight after signing in**: `NEXT_PUBLIC_API_URL` is still set in `eudr_web/.env.local`. Delete that line and restart `npm run dev`.
- **"Can't reach the server"**: the backend isn't running on port 8000.
- **`relation "audit_events" does not exist`**: run `python -m scripts.migrate`.
- **"Too many wrong passwords"**: wait 15 minutes, or use Forgot password.
- **Invitation emails don't arrive on Vercel**: check `EUDR_EMAIL_BACKEND=resend`, the API key, and that the `EUDR_EMAIL_FROM` domain is verified in Resend.
- **Upload says storage is unavailable**: check the five `EUDR_S3_*` values.
- **Whisp says the key is wrong or expired**: keys last 365 days; create a new one on whisp.openforis.org.
