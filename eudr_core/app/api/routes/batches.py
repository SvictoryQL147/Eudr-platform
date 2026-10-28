from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user, get_owned, get_owned_via_farm
from app.database import get_db
from app.models import core as models
from app.schemas.core import BatchCreate, BatchInputDetail, BatchListItem, BatchOut

router = APIRouter(prefix="/api/v1/batches", tags=["batches"])


def _batch_item(batch: models.Batch) -> BatchListItem:
    inputs = []
    farm_ids = set()
    for bi in batch.inputs:
        ce = bi.collection_event
        farm = ce.farm if ce else None
        if farm:
            farm_ids.add(str(farm.id))
        inputs.append(
            BatchInputDetail(
                collection_event_id=str(bi.collection_event_id),
                quantity_kg=bi.quantity_kg,
                farm_id=str(farm.id) if farm else None,
                farm_name=farm.name if farm else None,
                farmer_name=farm.farmer.full_name if farm and farm.farmer else None,
            )
        )
    return BatchListItem(
        id=str(batch.id),
        output_kg=batch.output_kg,
        created_at=batch.created_at,
        input_total_kg=round(sum(i.quantity_kg for i in inputs), 3),
        input_count=len(inputs),
        farm_count=len(farm_ids),
        shipment_ids=[str(l.shipment_id) for l in batch.shipment_links],
        inputs=inputs,
    )


def _load_batches(db: Session):
    return db.query(models.Batch).options(
        selectinload(models.Batch.inputs)
        .selectinload(models.BatchInput.collection_event)
        .selectinload(models.CollectionEvent.farm)
        .selectinload(models.Farm.farmer),
        selectinload(models.Batch.shipment_links),
    )


@router.get("", response_model=list[BatchListItem])
def list_batches(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        _load_batches(db)
        .filter(models.Batch.organization_id == user.organization_id)
        .order_by(models.Batch.created_at.desc())
        .all()
    )
    return [_batch_item(b) for b in rows]


@router.post("", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Groups weighed collections into a batch/lot. Refuses to allocate more
    of a collection event than is left on it — the same kilo can't be
    counted into two batches (a classic way phantom volume enters the chain)."""
    seen: dict[str, float] = {}
    for item in payload.inputs:
        ce = get_owned_via_farm(db, models.CollectionEvent, item.collection_event_id, user, "Collection event")
        already = sum(bi.quantity_kg for bi in ce.batch_inputs)
        seen[item.collection_event_id] = seen.get(item.collection_event_id, 0) + item.quantity_kg
        remaining = ce.weight_kg - already
        if seen[item.collection_event_id] > remaining + 1e-6:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Collection event {item.collection_event_id} has only {remaining:.1f} kg left "
                    f"to batch, but {seen[item.collection_event_id]:.1f} kg was requested"
                ),
            )

    batch = models.Batch(organization_id=user.organization_id, output_kg=payload.output_kg)
    db.add(batch)
    db.flush()
    for item in payload.inputs:
        db.add(
            models.BatchInput(
                batch_id=batch.id,
                collection_event_id=item.collection_event_id,
                quantity_kg=item.quantity_kg,
            )
        )
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchListItem)
def get_batch(batch_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_owned(db, models.Batch, batch_id, user, "Batch")
    return _batch_item(_load_batches(db).filter(models.Batch.id == batch_id).one())
