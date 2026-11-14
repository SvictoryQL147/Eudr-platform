import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.auth import users_router
from app.api.routes.batches import router as batches_router
from app.api.routes.compliance import router as compliance_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.documents import router as documents_router
from app.api.routes.farmers import router as farmers_router
from app.api.routes.farms import router as farms_router
from app.api.routes.harvests import collections_router, harvests_router
from app.api.routes.screening import router as screening_router
from app.api.routes.shipments import router as shipments_router
from app.config import get_settings
from app.database import SessionLocal
from app.services import audit as _audit  # noqa: F401  (registers the audit hook)

settings = get_settings()
log = logging.getLogger("ala")

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=0.1,
        send_default_pii=False,  # never ship emails, cookies or bodies to Sentry
    )

if settings.environment == "production" and settings.jwt_secret.startswith("dev-only"):
    log.error("EUDR_JWT_SECRET is still the development default. Set a long random value.")

app = FastAPI(
    title=f"{settings.app_name} API",
    description=(
        "EUDR traceability and compliance for commodity exporters: farmers, farm polygons, "
        "deforestation screening, batches, shipments, a 21-rule readiness engine and evidence packs. "
        "Sign in at /api/v1/auth/login. Browsers get an httpOnly cookie; scripts can send the returned "
        "access_token as a Bearer header."
    ),
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("X-Frame-Options", "DENY")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")
    if request.url.path.startswith("/api/"):
        h.setdefault("Cache-Control", "no-store")
    if settings.app_url.startswith("https://"):
        h.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    return response


for router in (
    auth_router,
    users_router,
    audit_router,
    dashboard_router,
    farmers_router,
    farms_router,
    harvests_router,
    collections_router,
    batches_router,
    shipments_router,
    documents_router,
    compliance_router,
    screening_router,
):
    app.include_router(router)


@app.get("/health")
def health():
    """Liveness: the function is up."""
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    """Readiness: the database answers. Point your uptime monitor here."""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "error", "database": "unreachable"}, status_code=503)
    return {"status": "ok", "database": "ok", "storage": settings.storage_backend,
            "email": settings.email_backend, "screening": settings.screening_provider}
