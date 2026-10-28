from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user, get_owned
from app.database import get_db
from app.models import core as models
from app.schemas.core import (
    CollectionEventCreate,
    CollectionEventOut,
    CollectionListItem,
    HarvestCreate,
    HarvestListItem,
    HarvestOut,
)

harvests_router = APIRouter(prefix="/api/v1/harvests", tags=["harvests"])
collections_router = APIRouter(prefix="/api/v1/collection-events", tags=["collection-events"])


@harvests_router.get("", response_model=list[HarvestListItem])
def list_harvests(
    farm_id: str | None = Query(default=None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Harvest)
        .join(models.Farm, models.Harvest.farm_id == models.Farm.id)
        .options(selectinload(models.Harvest.farm).selectinload(models.Farm.farmer))
        .filter(models.Farm.organization_id == user.organization_id)
    )
    if farm_id:
        query = query.filter(models.Harvest.farm_id == farm_id)
    return [
        HarvestListItem(
            **HarvestOut.model_validate(h).model_dump(),
            farm_name=h.farm.name if h.farm else None,
            farmer_name=h.farm.farmer.full_name if h.farm and h.farm.farmer else None,
            created_at=h.created_at,
        )
        for h in query.order_by(models.Harvest.created_at.desc()).all()
    ]


@harvests_router.post("", response_model=HarvestOut, status_code=status.HTTP_201_CREATED)
def create_harvest(payload: HarvestCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_owned(db, models.Farm, payload.farm_id, user, "Farm")
    harvest = models.Harvest(**payload.model_dump())
    db.add(harvest)
    db.commit()
    db.refresh(harvest)
    return harvest


@collections_router.get("", response_model=list[CollectionListItem])
def list_collection_events(
    farm_id: str | None = Query(default=None),
    available_only: bool = Query(default=False, description="Only events with weight not yet put into a batch"),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.CollectionEvent)
        .join(models.Farm, models.CollectionEvent.farm_id == models.Farm.id)
        .options(
            selectinload(models.CollectionEvent.farm).selectinload(models.Farm.farmer),
            selectinload(models.CollectionEvent.batch_inputs),
        )
        .filter(models.Farm.organization_id == user.organization_id)
    )
    if farm_id:
        query = query.filter(models.CollectionEvent.farm_id == farm_id)
    agents = {
        str(u.id): u.name
        for u in db.query(models.User).filter(models.User.organization_id == user.organization_id).all()
    }
    items = []
    for ce in query.order_by(models.CollectionEvent.created_at.desc()).all():
        batched = sum(bi.quantity_kg for bi in ce.batch_inputs)
        available = max(0.0, round(ce.weight_kg - batched, 3))
        if available_only and available <= 0:
            continue
        items.append(
            CollectionListItem(
                **CollectionEventOut.model_validate(ce).model_dump(),
                farm_name=ce.farm.name if ce.farm else None,
                farmer_name=ce.farm.farmer.full_name if ce.farm and ce.farm.farmer else None,
                agent_user_id=str(ce.agent_user_id) if ce.agent_user_id else None,
                agent_name=agents.get(str(ce.agent_user_id)) if ce.agent_user_id else None,
                quality_grade=ce.quality_grade,
                location_recorded=ce.location_recorded,
                collected_at=ce.collected_at,
                created_at=ce.created_at,
                batched_kg=round(batched, 3),
                available_kg=available,
            )
        )
    return items


@collections_router.post("", response_model=CollectionEventOut, status_code=status.HTTP_201_CREATED)
def create_collection_event(
    payload: CollectionEventCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned(db, models.Farm, payload.farm_id, user, "Farm")
    if payload.agent_user_id:
        get_owned(db, models.User, payload.agent_user_id, user, "Agent")
    collection = models.CollectionEvent(**payload.model_dump())
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection
