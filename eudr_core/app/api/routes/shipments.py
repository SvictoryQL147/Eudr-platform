import json

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user, get_owned
from app.database import get_db
from app.models import core as models
from app.schemas.core import ShipmentCreate, ShipmentListItem, ShipmentOut, ShipmentUpdate
from app.services.evidence_pack import build_evidence_pack, build_geojson

router = APIRouter(prefix="/api/v1/shipments", tags=["shipments"])


def _latest(shipment: models.Shipment):
    return max(shipment.assessments, key=lambda a: a.computed_at, default=None)


def _list_item(s: models.Shipment) -> ShipmentListItem:
    latest = _latest(s)
    return ShipmentListItem(
        **ShipmentOut.model_validate(s).model_dump(),
        created_at=s.created_at,
        batch_count=len(s.batch_links),
        net_mass_kg=round(sum(l.batch.output_kg for l in s.batch_links if l.batch), 3),
        latest_score=latest.readiness_score if latest else None,
        is_blocked=latest.is_blocked if latest else None,
        last_assessed_at=latest.computed_at if latest else None,
        open_findings=len(latest.findings) if latest else 0,
    )


def _query(db: Session):
    return db.query(models.Shipment).options(
        selectinload(models.Shipment.batch_links).selectinload(models.ShipmentBatch.batch),
        selectinload(models.Shipment.assessments).selectinload(models.ComplianceAssessment.findings),
    )


def _check_batches(db: Session, batch_ids: list[str], user: models.User, shipment_id: str | None = None):
    for batch_id in batch_ids:
        batch = get_owned(db, models.Batch, batch_id, user, "Batch")
        other = [str(l.shipment_id) for l in batch.shipment_links if str(l.shipment_id) != str(shipment_id)]
        if other:
            raise HTTPException(
                status_code=422,
                detail=f"Batch {batch_id} is already in another shipment — a batch can only ship once",
            )


@router.get("", response_model=list[ShipmentListItem])
def list_shipments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        _query(db)
        .filter(models.Shipment.organization_id == user.organization_id)
        .order_by(models.Shipment.created_at.desc())
        .all()
    )
    return [_list_item(s) for s in rows]


@router.post("", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
def create_shipment(payload: ShipmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    _check_batches(db, payload.batch_ids, user)
    shipment = models.Shipment(
        organization_id=user.organization_id,
        destination_country=payload.destination_country,
        buyer_name=payload.buyer_name,
        reference=payload.reference,
        commodity=payload.commodity or "cocoa",
        hs_code=payload.hs_code or "1801",
    )
    db.add(shipment)
    db.flush()
    for batch_id in payload.batch_ids:
        db.add(models.ShipmentBatch(shipment_id=shipment.id, batch_id=batch_id))
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentListItem)
def get_shipment(shipment_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    return _list_item(_query(db).filter(models.Shipment.id == shipment_id).one())


@router.patch("/{shipment_id}", response_model=ShipmentListItem)
def update_shipment(
    shipment_id: str,
    payload: ShipmentUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shipment = get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    for key in ("destination_country", "buyer_name", "reference", "commodity", "hs_code"):
        value = getattr(payload, key)
        if value is not None:
            setattr(shipment, key, value)
    _check_batches(db, payload.add_batch_ids, user, shipment_id)
    existing = {str(l.batch_id) for l in shipment.batch_links}
    for batch_id in payload.add_batch_ids:
        if batch_id not in existing:
            db.add(models.ShipmentBatch(shipment_id=shipment.id, batch_id=batch_id))
    for link in list(shipment.batch_links):
        if str(link.batch_id) in set(payload.remove_batch_ids):
            db.delete(link)
    db.commit()
    db.expire_all()
    return _list_item(_query(db).filter(models.Shipment.id == shipment_id).one())


@router.get("/{shipment_id}/evidence-pack")
def evidence_pack(shipment_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full JSON evidence bundle for the EU buyer. See services/evidence_pack.py."""
    shipment = get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    return build_evidence_pack(shipment, db)


@router.get("/{shipment_id}/geolocation.geojson")
def geolocation_geojson(shipment_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Plot geolocation for the buyer's DDS, as a downloadable GeoJSON file."""
    shipment = get_owned(db, models.Shipment, shipment_id, user, "Shipment")
    body = json.dumps(build_geojson(shipment, db), indent=2)
    name = (shipment.reference or str(shipment.id)[:8]).replace(" ", "_")
    return Response(
        content=body,
        media_type="application/geo+json",
        headers={"Content-Disposition": f'attachment; filename="{name}_plots.geojson"'},
    )
