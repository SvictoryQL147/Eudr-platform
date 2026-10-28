from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_owned
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models
from app.services import deforestation as d

router = APIRouter(prefix="/api/v1/screening", tags=["deforestation screening"])


class ScreeningRequest(BaseModel):
    farm_ids: list[str] = Field(default_factory=list)
    shipment_id: str | None = None
    # True = skip farms whose current boundary already has a result.
    only_unscreened: bool = True


class JobOut(BaseModel):
    id: str
    status: str
    provider: str
    farm_count: int
    done_count: int
    error: str | None = None
    created_at: str | None = None
    finished_at: str | None = None


def _job_out(j: models.ScreeningJob) -> JobOut:
    return JobOut(
        id=str(j.id),
        status=j.status,
        provider=j.provider,
        farm_count=j.farm_count,
        done_count=j.done_count,
        error=j.error,
        created_at=j.created_at.isoformat() if j.created_at else None,
        finished_at=j.finished_at.isoformat() if j.finished_at else None,
    )


@router.get("/status")
def screening_status(settings: Settings = Depends(get_settings), user: models.User = Depends(get_current_user)):
    """Tells the dashboard whether screening is available and if it's demo."""
    try:
        provider = d.get_provider(settings)
        return {"enabled": True, "provider": provider.name, "demo": provider.name == "demo", "message": None}
    except d.ScreeningUnavailable as exc:
        return {"enabled": False, "provider": settings.screening_provider, "demo": False, "message": str(exc)}


def _farms_for_request(db: Session, payload: ScreeningRequest, user: models.User) -> list[models.Farm]:
    q = db.query(models.Farm).filter(
        models.Farm.organization_id == user.organization_id, models.Farm.polygon.isnot(None)
    )
    if payload.shipment_id:
        shipment = get_owned(db, models.Shipment, payload.shipment_id, user, "Shipment")
        ids = {
            str(bi.collection_event.farm_id)
            for link in shipment.batch_links
            if link.batch
            for bi in link.batch.inputs
            if bi.collection_event
        }
        q = q.filter(models.Farm.id.in_(ids or ["00000000-0000-0000-0000-000000000000"]))
    elif payload.farm_ids:
        q = q.filter(models.Farm.id.in_(payload.farm_ids))
    farms = q.all()
    if payload.only_unscreened:
        latest = d.latest_screenings(db, [str(f.id) for f in farms])
        farms = [f for f in farms if (s := latest.get(str(f.id))) is None or s.polygon_hash != d.polygon_hash(f)]
    return farms


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def start_job(
    payload: ScreeningRequest,
    background: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Screens mapped farms for deforestation after 2020. Runs in the
    background; poll GET /screening/jobs/{id}. Unmapped farms are skipped."""
    try:
        provider = d.get_provider(settings)
    except d.ScreeningUnavailable as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    farms = _farms_for_request(db, payload, user)
    commodity = "cocoa"
    if payload.shipment_id:
        commodity = db.get(models.Shipment, payload.shipment_id).commodity or "cocoa"
    job = models.ScreeningJob(
        organization_id=user.organization_id,
        requested_by=str(user.id),
        provider=provider.name,
        status="queued" if farms else "done",
        farm_ids=[str(f.id) for f in farms],
        farm_count=len(farms),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    if farms:
        background.add_task(d.run_screening_job, str(job.id), None, None, commodity)
    return _job_out(job)


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(models.ScreeningJob)
        .filter(models.ScreeningJob.organization_id == user.organization_id)
        .order_by(models.ScreeningJob.created_at.desc())
        .limit(20)
        .all()
    )
    return [_job_out(j) for j in rows]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _job_out(get_owned(db, models.ScreeningJob, job_id, user, "Screening job"))


@router.get("/farms/{farm_id}")
def farm_history(farm_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = get_owned(db, models.Farm, farm_id, user, "Farm")
    current = d.polygon_hash(farm)
    rows = (
        db.query(models.FarmScreening)
        .filter(models.FarmScreening.farm_id == farm_id)
        .order_by(models.FarmScreening.screened_at.desc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "provider": r.provider,
            "risk": r.risk,
            "indicators": r.indicators,
            "commodity": r.commodity,
            "screened_at": r.screened_at.isoformat() if r.screened_at else None,
            "current_boundary": r.polygon_hash == current,
        }
        for r in rows
    ]
