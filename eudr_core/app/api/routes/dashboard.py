from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    org_id = user.organization_id
    farmers = db.query(func.count(models.Farmer.id)).filter(models.Farmer.organization_id == org_id).scalar() or 0
    farms = db.query(models.Farm).filter(models.Farm.organization_id == org_id)
    farm_count = farms.count()
    mapped = farms.filter(models.Farm.polygon.isnot(None)).count()
    hectares = (
        db.query(func.coalesce(func.sum(models.Farm.area_hectares), 0))
        .filter(models.Farm.organization_id == org_id)
        .scalar()
    )
    collected = (
        db.query(func.coalesce(func.sum(models.CollectionEvent.weight_kg), 0))
        .join(models.Farm, models.CollectionEvent.farm_id == models.Farm.id)
        .filter(models.Farm.organization_id == org_id)
        .scalar()
    )

    shipments = (
        db.query(models.Shipment)
        .options(selectinload(models.Shipment.assessments).selectinload(models.ComplianceAssessment.findings))
        .filter(models.Shipment.organization_id == org_id)
        .all()
    )
    ready = blocked = not_assessed = 0
    scores: list[int] = []
    rule_counter: Counter = Counter()
    rule_titles: dict[str, tuple[str, str]] = {}
    for s in shipments:
        latest = max(s.assessments, key=lambda a: a.computed_at, default=None)
        if latest is None:
            not_assessed += 1
            continue
        scores.append(latest.readiness_score)
        if latest.is_blocked:
            blocked += 1
        else:
            ready += 1
        for f in latest.findings:
            rule_counter[f.rule_id] += 1
            rule_titles[f.rule_id] = (f.title, f.severity.value)

    from app.services.deforestation import latest_screenings, polygon_hash

    mapped_farms = farms.filter(models.Farm.polygon.isnot(None)).all()
    latest = latest_screenings(db, [str(f.id) for f in mapped_farms])
    risk_counts = {"low": 0, "more_info_needed": 0, "high": 0, "not_screened": 0}
    for f in mapped_farms:
        s = latest.get(str(f.id))
        if s is None or s.polygon_hash != polygon_hash(f):
            risk_counts["not_screened"] += 1
        else:
            risk_counts[s.risk] = risk_counts.get(s.risk, 0) + 1

    deadline = date.fromisoformat(settings.eudr_deadline)
    return {
        "organization_name": db.get(models.Organization, org_id).name,
        "farmers": farmers,
        "farms": farm_count,
        "mapped_farms": mapped,
        "mapped_pct": round(100 * mapped / farm_count) if farm_count else 0,
        "total_hectares": round(float(hectares or 0), 2),
        "collected_kg": round(float(collected or 0), 1),
        "shipments": len(shipments),
        "shipments_ready": ready,
        "shipments_blocked": blocked,
        "shipments_not_assessed": not_assessed,
        "average_score": round(sum(scores) / len(scores)) if scores else None,
        "top_issues": [
            {"rule_id": rid, "title": rule_titles[rid][0], "severity": rule_titles[rid][1], "shipments": n}
            for rid, n in rule_counter.most_common(5)
        ],
        "deforestation": risk_counts,
        "eudr_deadline": settings.eudr_deadline,
        "days_to_deadline": (deadline - date.today()).days,
    }
