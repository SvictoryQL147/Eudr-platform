import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon
from sqlalchemy.orm import Session, selectinload

from app.api.serializers import farm_detail
from app.auth import get_current_user, get_owned
from app.database import get_db
from app.models import core as models
from app.schemas.core import FarmCreate, FarmDetail, FarmOut, FarmUpdate
from app.services.deforestation import latest_screenings

router = APIRouter(prefix="/api/v1/farms", tags=["farms"])

# Rough meters-per-degree at the equator, refined by latitude — good
# enough for smallholder plot sizes. For production accuracy, compute
# area server-side with PostGIS's geography cast (ST_Area(geog)) instead.
_METERS_PER_DEGREE_LAT = 111_320.0


def _estimate_area_hectares(ring_lonlat: list[tuple[float, float]]) -> float:
    if len(ring_lonlat) < 3:
        return 0.0
    avg_lat = sum(lat for _, lat in ring_lonlat) / len(ring_lonlat)
    meters_per_degree_lon = _METERS_PER_DEGREE_LAT * math.cos(math.radians(avg_lat))
    projected = [(lon * meters_per_degree_lon, lat * _METERS_PER_DEGREE_LAT) for lon, lat in ring_lonlat]
    return Polygon(projected).area / 10_000  # m^2 -> hectares


def _validate_ring(ring: list[tuple[float, float]]) -> Polygon:
    if len(ring) < 3:
        raise HTTPException(status_code=422, detail="A farm boundary needs at least 3 points")
    for lon, lat in ring:
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise HTTPException(
                status_code=422,
                detail=f"Point ({lon}, {lat}) is not a valid longitude/latitude — "
                "points must be [longitude, latitude]",
            )
    return Polygon(ring)


def _check_farmer(db: Session, farmer_id: str | None, user: models.User):
    if farmer_id:
        get_owned(db, models.Farmer, farmer_id, user, "Farmer")


@router.get("", response_model=list[FarmDetail])
def list_farms(
    farmer_id: str | None = Query(default=None),
    mapped: bool | None = Query(default=None, description="true = only mapped, false = only unmapped"),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Farm)
        .options(
            selectinload(models.Farm.farmer),
            selectinload(models.Farm.harvests),
            selectinload(models.Farm.collection_events),
        )
        .filter(models.Farm.organization_id == user.organization_id)
    )
    if farmer_id:
        query = query.filter(models.Farm.farmer_id == farmer_id)
    if mapped is True:
        query = query.filter(models.Farm.polygon.isnot(None))
    elif mapped is False:
        query = query.filter(models.Farm.polygon.is_(None))
    rows = query.order_by(models.Farm.created_at.desc()).all()
    latest = latest_screenings(db, [str(f.id) for f in rows])
    return [farm_detail(f, latest.get(str(f.id))) for f in rows]


@router.post("", response_model=FarmDetail, status_code=status.HTTP_201_CREATED)
def create_farm(payload: FarmCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    _check_farmer(db, payload.farmer_id, user)
    polygon_geom = None
    area_hectares = payload.area_hectares

    if payload.polygon_ring:
        shapely_polygon = _validate_ring(payload.polygon_ring)
        polygon_geom = from_shape(shapely_polygon, srid=4326)
        if area_hectares is None:
            area_hectares = round(_estimate_area_hectares(payload.polygon_ring), 4)

    farm = models.Farm(
        organization_id=user.organization_id,
        farmer_id=payload.farmer_id,
        name=payload.name,
        polygon=polygon_geom,
        area_hectares=area_hectares,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm_detail(farm)


@router.get("/{farm_id}", response_model=FarmDetail)
def get_farm(farm_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = get_owned(db, models.Farm, farm_id, user, "Farm")
    return farm_detail(farm, latest_screenings(db, [farm_id]).get(farm_id))


@router.patch("/{farm_id}", response_model=FarmDetail)
def update_farm(
    farm_id: str,
    payload: FarmUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a farm — most often to add or redraw its boundary after an
    agent has walked it."""
    farm = get_owned(db, models.Farm, farm_id, user, "Farm")
    data = payload.model_dump(exclude_unset=True)
    if "farmer_id" in data:
        _check_farmer(db, data["farmer_id"], user)
        farm.farmer_id = data["farmer_id"]
    if "name" in data:
        farm.name = data["name"]
    if payload.clear_polygon:
        farm.polygon = None
        farm.area_hectares = None
    elif payload.polygon_ring:
        shp = _validate_ring(payload.polygon_ring)
        farm.polygon = from_shape(shp, srid=4326)
        farm.area_hectares = round(_estimate_area_hectares(payload.polygon_ring), 4)
    db.commit()
    db.refresh(farm)
    return farm_detail(farm, latest_screenings(db, [farm_id]).get(farm_id))
