from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user, get_owned
from app.database import get_db
from app.models import core as models
from app.schemas.core import FarmerCreate, FarmerListItem, FarmerOut, FarmerUpdate

router = APIRouter(prefix="/api/v1/farmers", tags=["farmers"])


def _list_item(f: models.Farmer) -> FarmerListItem:
    farms = f.farms or []
    return FarmerListItem(
        **FarmerOut.model_validate(f).model_dump(),
        farm_count=len(farms),
        mapped_farm_count=sum(1 for fm in farms if fm.polygon is not None),
        total_hectares=round(sum(fm.area_hectares or 0 for fm in farms), 3),
    )


@router.get("", response_model=list[FarmerListItem])
def list_farmers(
    q: str | None = Query(default=None, description="Search name, phone, community or state"),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Farmer)
        .options(selectinload(models.Farmer.farms))
        .filter(models.Farmer.organization_id == user.organization_id)
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Farmer.full_name.ilike(like),
                models.Farmer.phone_number.ilike(like),
                models.Farmer.community.ilike(like),
                models.Farmer.state.ilike(like),
            )
        )
    return [_list_item(f) for f in query.order_by(models.Farmer.created_at.desc()).all()]


@router.post("", response_model=FarmerOut, status_code=status.HTTP_201_CREATED)
def create_farmer(
    payload: FarmerCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude={"organization_id"})
    farmer = models.Farmer(organization_id=user.organization_id, **data)
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    return farmer


@router.get("/{farmer_id}", response_model=FarmerListItem)
def get_farmer(farmer_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _list_item(get_owned(db, models.Farmer, farmer_id, user, "Farmer"))


@router.patch("/{farmer_id}", response_model=FarmerOut)
def update_farmer(
    farmer_id: str,
    payload: FarmerUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    farmer = get_owned(db, models.Farmer, farmer_id, user, "Farmer")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(farmer, key, value)
    db.commit()
    db.refresh(farmer)
    return farmer
