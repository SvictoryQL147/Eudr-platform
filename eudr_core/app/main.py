from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

settings = get_settings()

app = FastAPI(
    title="EUDR Compliance Core",
    description=(
        "Traceability and compliance backend for Nigerian commodity exporters — "
        "data model, 20-rule compliance engine, readiness scoring, evidence packs. "
        "Sign in via /api/v1/auth/login and use the token as a Bearer header."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

for router in (
    auth_router,
    users_router,
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
    return {"status": "ok"}
