from shapely.geometry import Polygon

from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def missing_geolocation(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="farm.missing_geolocation",
            severity="critical",
            title="Farm has no recorded geolocation",
            message=f"Farm {farm.id} has no polygon on file.",
            remediation="Send a field agent to map this farm's boundary before it can ship.",
            entity_type="farm",
            entity_id=farm.id,
        )
        for farm in ctx.farms.values()
        if not farm.has_geolocation
    ]


def invalid_polygon_geometry(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="farm.invalid_polygon_geometry",
            severity="high",
            title="Farm polygon is self-intersecting or degenerate",
            message=f"Farm {farm.id}'s recorded boundary is not a valid simple polygon.",
            remediation="Re-map this farm's boundary — the current polygon crosses itself.",
            entity_type="farm",
            entity_id=farm.id,
        )
        for farm in ctx.farms.values()
        if farm.has_geolocation and not farm.polygon_is_valid
    ]


def implausible_polygon_area(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    findings = []
    for farm in ctx.farms.values():
        if farm.polygon_area_hectares is None:
            continue
        if farm.polygon_area_hectares < settings.min_plausible_farm_hectares:
            findings.append(
                Finding(
                    rule_id="farm.implausible_polygon_area",
                    severity="medium",
                    title="Farm area implausibly small",
                    message=(
                        f"Farm {farm.id} is recorded at {farm.polygon_area_hectares:.3f} ha, "
                        f"below the {settings.min_plausible_farm_hectares} ha floor."
                    ),
                    remediation="Confirm the mapped boundary actually covers the full plot.",
                    entity_type="farm",
                    entity_id=farm.id,
                )
            )
        elif farm.polygon_area_hectares > settings.max_plausible_farm_hectares:
            findings.append(
                Finding(
                    rule_id="farm.implausible_polygon_area",
                    severity="medium",
                    title="Farm area implausibly large for a smallholder plot",
                    message=(
                        f"Farm {farm.id} is recorded at {farm.polygon_area_hectares:.1f} ha, "
                        f"above the {settings.max_plausible_farm_hectares} ha ceiling."
                    ),
                    remediation="Verify this isn't several plots merged into one boundary by mistake.",
                    entity_type="farm",
                    entity_id=farm.id,
                )
            )
    return findings


def duplicate_farm_geometry(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    """Flags farms whose boundaries substantially overlap — the same
    physical plot registered twice (by different agents, or the same
    farmer under two identities) inflates traceable volume without any
    real production behind it. IoU is computed directly on raw lat/lon
    coordinates: since overlapping polygons are by definition
    geographically co-located, the local projection distortion is
    approximately shared by both and mostly cancels in the ratio — see
    services/boundary_verification.py in the WalkProof service for the
    fuller treatment when absolute distances matter, not just a ratio."""
    findings: list[Finding] = []
    farms_with_geo = [
        f for f in ctx.farms.values() if f.polygon_coords and len(f.polygon_coords) >= 3
    ]

    for i in range(len(farms_with_geo)):
        for j in range(i + 1, len(farms_with_geo)):
            farm_a, farm_b = farms_with_geo[i], farms_with_geo[j]
            poly_a = Polygon([(lon, lat) for lat, lon in farm_a.polygon_coords]).buffer(0)
            poly_b = Polygon([(lon, lat) for lat, lon in farm_b.polygon_coords]).buffer(0)

            union_area = poly_a.union(poly_b).area
            if union_area == 0:
                continue
            overlap_ratio = poly_a.intersection(poly_b).area / union_area

            if overlap_ratio > settings.farm_overlap_area_ratio_threshold:
                findings.append(
                    Finding(
                        rule_id="farm.duplicate_farm_geometry",
                        severity="critical",
                        title="Farm boundary overlaps another registered farm",
                        message=(
                            f"Farm {farm_a.id} overlaps farm {farm_b.id} by "
                            f"{overlap_ratio:.0%} of their combined area."
                        ),
                        remediation=(
                            "Confirm these are two distinct plots, not the same plot "
                            "registered under two farms."
                        ),
                        entity_type="farm",
                        entity_id=farm_a.id,
                    )
                )
                findings.append(
                    Finding(
                        rule_id="farm.duplicate_farm_geometry",
                        severity="critical",
                        title="Farm boundary overlaps another registered farm",
                        message=(
                            f"Farm {farm_b.id} overlaps farm {farm_a.id} by "
                            f"{overlap_ratio:.0%} of their combined area."
                        ),
                        remediation=(
                            "Confirm these are two distinct plots, not the same plot "
                            "registered under two farms."
                        ),
                        entity_type="farm",
                        entity_id=farm_b.id,
                    )
                )
    return findings


def missing_farmer_link(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="farm.missing_farmer_link",
            severity="high",
            title="Farm has no linked farmer identity",
            message=f"Farm {farm.id} is not linked to any farmer record.",
            remediation="Link this farm to the farmer who owns/works it.",
            entity_type="farm",
            entity_id=farm.id,
        )
        for farm in ctx.farms.values()
        if farm.farmer_id is None
    ]


RULES = [
    missing_geolocation,
    invalid_polygon_geometry,
    implausible_polygon_area,
    duplicate_farm_geometry,
    missing_farmer_link,
]
