"""Turns ORM rows into the richer read models the dashboard needs.
Kept out of the route files so list and detail endpoints stay identical."""
from geoalchemy2.shape import to_shape

from app.models import core as models
from app.schemas.core import FarmDetail


def farm_geometry(farm: models.Farm):
    """Returns (ring [[lon, lat], ...], centroid [lon, lat], is_valid) or Nones."""
    if farm.polygon is None:
        return None, None, None
    shape = to_shape(farm.polygon)
    ring = [[round(x, 7), round(y, 7)] for x, y in shape.exterior.coords]
    c = shape.centroid
    return ring, [round(c.x, 7), round(c.y, 7)], bool(shape.is_valid)


def farm_detail(farm: models.Farm, screening: models.FarmScreening | None = None) -> FarmDetail:
    from app.services.deforestation import polygon_hash

    ring, centroid, valid = farm_geometry(farm)
    current = screening is not None and farm.polygon is not None and screening.polygon_hash == polygon_hash(farm)
    return FarmDetail(
        deforestation_risk=screening.risk if current else None,
        screening_provider=screening.provider if current else None,
        screened_at=screening.screened_at if current else None,
        screening_indicators=screening.indicators if current else None,
        screening_outdated=screening is not None and not current,
        id=str(farm.id),
        farmer_id=str(farm.farmer_id) if farm.farmer_id else None,
        name=farm.name,
        area_hectares=farm.area_hectares,
        farmer_name=farm.farmer.full_name if farm.farmer else None,
        has_geolocation=farm.polygon is not None,
        polygon_ring=ring,
        centroid=centroid,
        polygon_is_valid=valid,
        harvested_kg=sum(h.quantity_kg for h in farm.harvests),
        collected_kg=sum(c.weight_kg for c in farm.collection_events),
        created_at=farm.created_at,
    )
