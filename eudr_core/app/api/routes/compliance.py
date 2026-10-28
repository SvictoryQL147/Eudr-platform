from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_owned
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models
from app.schemas.core import AssessmentSummary, FindingOut, ReadinessOut
from app.services.compliance_engine import build_context_from_db, run_all_rules
from app.services.readiness import compute_readiness

router = APIRouter(prefix="/api/v1/shipments", tags=["compliance"])


@router.post("/{shipment_id}/assess", response_model=ReadinessOut, status_code=status.HTTP_201_CREATED)
def assess_shipment(
    shipment_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Runs all 20 deterministic rules against the current state of the
    shipment's traceability graph and persists the result. Call this
    again any time the underlying data changes — e.g. after a missing
    document is uploaded — to get a fresh score; assessments are
    immutable snapshots, not updated in place, so the history of how a
    shipment's readiness evolved over time is preserved."""
    get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    try:
        ctx = build_context_from_db(shipment_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    findings = run_all_rules(ctx, settings)
    result = compute_readiness(findings, settings)

    assessment = models.ComplianceAssessment(
        shipment_id=shipment_id, readiness_score=result.score, is_blocked=result.is_blocked
    )
    db.add(assessment)
    db.flush()

    for f in findings:
        db.add(
            models.ComplianceFinding(
                assessment_id=assessment.id,
                rule_id=f.rule_id,
                severity=models.FindingSeverity(f.severity),
                title=f.title,
                message=f.message,
                remediation=f.remediation,
                entity_type=f.entity_type,
                entity_id=f.entity_id,
            )
        )
    db.commit()
    db.refresh(assessment)

    return ReadinessOut(
        shipment_id=shipment_id,
        score=result.score,
        is_blocked=result.is_blocked,
        computed_at=assessment.computed_at,
        findings=[FindingOut(**vars(f)) for f in findings],
    )


@router.get("/{shipment_id}/readiness", response_model=ReadinessOut)
def get_readiness(shipment_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the most recent assessment. Does NOT re-run the rules —
    call POST .../assess for a fresh score."""
    get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    assessment = (
        db.query(models.ComplianceAssessment)
        .filter(models.ComplianceAssessment.shipment_id == shipment_id)
        .order_by(models.ComplianceAssessment.computed_at.desc())
        .first()
    )
    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail=f"No assessment found for shipment {shipment_id} — POST .../assess first",
        )

    return ReadinessOut(
        shipment_id=shipment_id,
        score=assessment.readiness_score,
        is_blocked=assessment.is_blocked,
        computed_at=assessment.computed_at,
        findings=[
            FindingOut(
                rule_id=f.rule_id,
                severity=f.severity.value,
                title=f.title,
                message=f.message,
                remediation=f.remediation,
                entity_type=f.entity_type,
                entity_id=f.entity_id,
            )
            for f in assessment.findings
        ],
    )


@router.get("/{shipment_id}/assessments", response_model=list[AssessmentSummary])
def assessment_history(shipment_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Every past assessment, newest first — shows how readiness moved as
    gaps were fixed."""
    get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    rows = (
        db.query(models.ComplianceAssessment)
        .filter(models.ComplianceAssessment.shipment_id == shipment_id)
        .order_by(models.ComplianceAssessment.computed_at.desc())
        .all()
    )
    return [
        AssessmentSummary(
            id=str(a.id),
            score=a.readiness_score,
            is_blocked=a.is_blocked,
            computed_at=a.computed_at,
            finding_count=len(a.findings),
        )
        for a in rows
    ]
