# EUDR Compliance Core

Backend for the EUDR traceability platform: data model, 20-rule compliance
engine, readiness scoring, and (since v0.2) sign-in, per-company data
isolation, document upload, dashboard stats and shipment evidence packs.
The web dashboard that uses it lives next door in `../eudr_web`.

## What changed in v0.3 (deforestation screening)

- **Rule 21, `farm.deforestation_risk`**: the EUDR question itself. Each
  mapped plot is screened with **Whisp** ("What is in that plot?", FAO /
  Forest Data Partnership, MIT licence) through its public API. Whisp
  checks the plot against many satellite datasets: tree cover at the end
  of 2020, farmland in 2020, clearing before and after 2020, and returns
  `low`, `more_info_needed` or `high`. High → critical (blocks the
  shipment), more info needed → high, not screened → medium.
- Results are stored per farm **and per boundary**: redrawing a boundary
  makes the old result stop counting until the plot is screened again.
- Endpoints: `GET /api/v1/screening/status`, `POST /api/v1/screening/jobs`
  (by shipment, farm ids or all unscreened; runs in the background),
  `GET /api/v1/screening/jobs/{id}`, `GET /api/v1/screening/farms/{id}`.
- Evidence pack: per-plot results, `DeforestationRisk` on every GeoJSON
  feature, and an honest status (performed / partial / not performed).
- Settings in `.env`: `EUDR_SCREENING_PROVIDER=whisp` + `EUDR_WHISP_API_KEY`
  (get a key: sign in at whisp.openforis.org → account page). Or
  `EUDR_SCREENING_PROVIDER=demo` for fake, clearly-labelled DEMO results
  when showing the product without a key. Default is `none`.
- Run `migrations/002_deforestation_screening.sql` once on an existing DB.
- The Whisp client was tested against the API's documented contract with a
  fake HTTP server (sync and queued+polling); it has not yet been run
  against the live Whisp service with a real key.

Tests: 92 pass (`pytest tests/ -q`).

## What changed in v0.2 (web dashboard release)

- **Sign-in and companies.** `POST /api/v1/auth/register` creates a company
  (organization) and its admin; `POST /api/v1/auth/login` returns a token.
  Every endpoint now requires `Authorization: Bearer <token>`, and every
  query is scoped to the signed-in user's company — another exporter gets
  404 on your ids. `organization_id` in request bodies is now ignored.
- **List and edit endpoints** for farmers, farms (with polygon coordinates
  for maps), harvests, collections, batches, shipments, documents, users.
- **Anti-double-counting guards.** A collection's kilos can't be put into
  batches twice, and a batch can only be in one shipment (422 errors).
- **Document upload** (`POST /api/v1/documents/upload`, PDF/JPG/PNG/WEBP up
  to 15 MB) stored under `storage/`, with download.
- **Evidence pack** (`GET /api/v1/shipments/{id}/evidence-pack`) and
  **plot GeoJSON** (`GET /api/v1/shipments/{id}/geolocation.geojson`) for the
  EU buyer's due diligence statement. See `app/services/evidence_pack.py`.
  It states plainly that deforestation screening has not been run.
- **Dashboard summary** (`GET /api/v1/dashboard/summary`).
- **Demo data**: `python -m scripts.seed_demo` (login `demo@eudr.ng` /
  `demo-password-2026`).
- `psycopg2-binary` bumped to 2.9.10 so it installs on Python 3.13.

**Already have the old database from pgAdmin?** Run
`migrations/001_auth_and_dashboard.sql` once in the Query Tool. It only adds
columns; your data stays. New databases just use `schema.sql`.

Tests: `pytest tests/ -q` → 78 pass (71 need no database; 7 run against a
real Postgres + PostGIS and are skipped if none is reachable).

---


The deterministic backbone of the EUDR smallholder traceability platform:
data model + 20-rule compliance engine + readiness scoring. This is the
strategy doc's own instruction (section 12) put into code: *"use
deterministic rules wherever a regulation or data-quality constraint can
be expressed deterministically"* — no AI, no external API, no GPU. Just
data integrity checks that either pass or don't.

66 tests pass for real (`pytest tests/ -v`) — no database, no GPU, no
external service needed to run them. That's most of what's in this repo:
the rules engine and API contract layer are fully testable in isolation
by design (see "Architecture" below).

**Verified against a real Postgres 16 + PostGIS instance, not just
mocked**: `tests/test_real_database_integration.py` (3 more tests, 69
total) runs the actual write path — farmer → farm with a real polygon →
harvest → collection → batch → shipment → document → assess — through a
live database. It caught one real bug during that process: SQLAlchemy
was sending Python enum *names* (`"EXPORT_CERTIFICATE"`) instead of the
lowercase *values* (`"export_certificate"`) the DDL enums expect, which
would have silently broken every document upload against a real
database despite all 66 mocked-DB tests passing. Fixed with
`values_callable` on every `Enum` column in `app/models/core.py`. This
is exactly why that integration test file exists — the mocked tests
prove the logic is right, this proves the ORM/DB boundary is right, and
those are genuinely different failure modes.

## What this actually is, honestly

This is the **deterministic core only** — the part of the strategy doc's
90-day plan (sections 8, 17) that needs no external infrastructure. It is
**not** the whole platform. Satellite risk screening, the AI copilot, the
PDF dossier generator, the mobile field app, and WalkProof's physical
boundary verification are explicitly out of scope here — see "What's not
built" below for why each one needs something this pass can't stand up
(a satellite API contract, a GPU, a mobile client, a product decision
only you can make).

## Data model

```
Organization -> User (role)
Farmer -> Farm (polygon, area) -> Harvest -> CollectionEvent
                                              |
                                          BatchInput -> Batch -> ShipmentBatch -> Shipment
Document (linked to farmer / batch / shipment)
ComplianceAssessment -> ComplianceFinding (per shipment, immutable snapshots)
```

`schema.sql` has the full DDL. `Harvest` (what the farmer says they
picked) is deliberately separate from `CollectionEvent` (what an agent
actually weighed and took) — the gap between them is itself one of the
20 rules.

## The 20 rules

| # | Rule | Severity | Category |
|---|---|---|---|
| 1 | `farm.missing_geolocation` | critical | Farm |
| 2 | `farm.invalid_polygon_geometry` | high | Farm |
| 3 | `farm.implausible_polygon_area` | medium | Farm |
| 4 | `farm.duplicate_farm_geometry` | critical | Farm |
| 5 | `farm.missing_farmer_link` | high | Farm |
| 6 | `farmer.missing_id_document` | high | Farmer |
| 7 | `farmer.missing_contact_info` | low | Farmer |
| 8 | `harvest.missing_date` | medium | Harvest |
| 9 | `harvest.date_in_future` | high | Harvest |
| 10 | `harvest.implausible_yield` | high | Harvest |
| 11 | `collection.missing_agent` | medium | Collection |
| 12 | `collection.missing_location` | medium | Collection |
| 13 | `collection.weight_exceeds_harvest` | critical | Collection |
| 14 | `batch.missing_inputs` | critical | Batch |
| 15 | `batch.quantity_mismatch` | critical | Batch |
| 16 | `batch.input_farm_not_verified` | high | Batch |
| 17 | `document.missing_required_shipment_document` | critical | Document |
| 18 | `document.expired` | high | Document |
| 19 | `shipment.missing_destination_or_buyer` | medium | Shipment |
| 20 | `shipment.traceability_incomplete` | critical | Shipment |

`tests/test_compliance_engine.py::test_exactly_twenty_rules_are_registered`
is a deliberate tripwire — if the count drifts, that test fails loudly
rather than the rule set silently growing or shrinking unnoticed.

Severity weights (critical=40, high=20, medium=10, low=5, subtracted from
100) and every numeric threshold (yield ceilings, overlap ratios,
tolerance bands) live in `app/config.py` as `Settings` fields with
docstrings explaining what each one means — they're reasonable starting
points, **not calibrated against real pilot data**. Expect to retune all
of them once real farms and shipments run through this.

## Architecture — why rules never touch the database

Every rule is a plain function: `(AssessmentContext, Settings) ->
list[Finding]`, operating on DB-independent dataclasses
(`app/services/rules/context.py`), never on SQLAlchemy ORM objects
directly. `app/services/compliance_engine.py::build_context_from_db` is
the *only* place that walks the ORM graph and flattens it into that
context. This is the same pattern WalkProof's `boundary_verification.py`
used, for the same reason: it's what makes 51 of the 66 tests here run
with zero database, in milliseconds, and it means the actual compliance
logic — the part worth the most scrutiny — is the easiest part of the
codebase to read, test, and audit.

```
POST /shipments/{id}/assess
        v
build_context_from_db()  <- the only ORM-touching function
        v
AssessmentContext (plain dataclasses)
        v
run_all_rules()  -> 20 rule functions, no side effects
        v
compute_readiness()  -> score, is_blocked, findings
        v
persisted as ComplianceAssessment + ComplianceFinding rows
```

## What's real vs stubbed

**Fully implemented and tested**: the entire rules engine (20/20 rules),
readiness scoring, the data model, and the API contract for every
write path (farmers, farms, harvests, collection events, batches,
shipments, documents, assess, readiness) — tested against a mocked DB
session, same pattern as WalkProof's `test_walks_api.py`.

**Stubbed on purpose, not silently missing**: OCR extraction
(`app/services/ocr.py`) follows the same interface pattern as
WalkProof's `reconstruction.py` — `MockOcrService` is what runs in dev,
and a real provider (the strategy doc names Mistral OCR / a Groq vision
model / a frontier VLM fallback) plugs in behind the same `extract()`
method. Nothing here guesses at a vendor's API without having tested
against it.

## What's NOT built, and why

These aren't oversights — each needs something this pass genuinely can't
provide:

- **AI copilot / LLM-assisted review** (doc section 10) — deliberately
  sequenced after the deterministic core per the doc's own plan; wiring
  an LLM in before the rules it would reason over exist gets the
  layering backwards.
- **PDF dossier generator** — a real but separate piece of work once the
  data this pulls together (assessment + documents + evidence) is
  flowing.
- **Mobile field app** — this is a backend; the field agent capture flow
  (farm registration, harvest/collection logging, photo/document upload)
  needs an actual mobile client.
- **WalkProof integration** — the `Farm` model here should become the
  single source of truth `Farm` that WalkProof's stub table gets replaced
  with (see that service's README), but that wiring hasn't been done.
- **Fine-grained roles and rate limiting** — sign-in and per-company
  isolation are done (v0.2); only "admin" is enforced (adding/deactivating
  users). Other roles are recorded but not yet restricted. Set a long
  random `EUDR_JWT_SECRET` before deploying anywhere public.
- **Alembic migrations** — `schema.sql` is a quick-start DDL, not a
  migration chain.
- **Cloud file storage** — uploads go to local disk (`storage/`). Move to
  S3/Cloudflare R2 before running on more than one server.

## Setting up the database in pgAdmin

1. In pgAdmin, right-click **Databases** → **Create** → **Database**.
   Name it `eudr_core`, owner `postgres` (or whatever role you use).
2. Open the **Query Tool** on that new database (right-click `eudr_core`
   → Query Tool).
3. Open `schema.sql` from this repo, paste its full contents into the
   Query Tool, and run it (F5). This creates the PostGIS extension, all
   11 tables, every enum type, and all indexes in one pass — you should
   see a string of `CREATE EXTENSION` / `CREATE TABLE` / `CREATE TYPE` /
   `CREATE INDEX` messages with no errors.
4. Confirm PostGIS is active: run `SELECT postgis_version();` — it
   should return a version string, not an error.
5. In this repo, `cp .env.example .env` and edit `EUDR_DATABASE_URL` to
   match your pgAdmin connection — same host/port/user/password you use
   to connect in pgAdmin itself, e.g.:
   ```
   EUDR_DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/eudr_core
   ```
6. `pip install -r requirements.txt` then `uvicorn app.main:app --reload`.
   Visit `http://127.0.0.1:8000/docs` — that's the live, interactive API.
7. You no longer need to insert an organization by hand: create an
   account in the web dashboard (or `POST /api/v1/auth/register`), or load
   the demo with `python -m scripts.seed_demo`.

From there, `/docs` lets you walk the whole pipeline by hand: create a
farmer, a farm (with a polygon), a harvest, a collection event, a batch,
a shipment, a document, then `POST /shipments/{id}/assess` to see a real
readiness score come back.

## Running locally

```bash
cp .env.example .env
pip install -r requirements.txt
pytest tests/ -v              # 66 tests, no DB needed
uvicorn app.main:app --reload # needs a real Postgres+PostGIS for the API to actually persist
```
