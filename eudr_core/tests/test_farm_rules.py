from dataclasses import replace

from app.config import Settings
from app.services.rules import farm_rules
from tests.fixtures import clean_context, clean_farm


def settings():
    return Settings()


def test_clean_farm_has_no_findings():
    ctx = clean_context()
    assert farm_rules.missing_geolocation(ctx, settings()) == []
    assert farm_rules.invalid_polygon_geometry(ctx, settings()) == []
    assert farm_rules.implausible_polygon_area(ctx, settings()) == []
    assert farm_rules.duplicate_farm_geometry(ctx, settings()) == []
    assert farm_rules.missing_farmer_link(ctx, settings()) == []


def test_missing_geolocation_fires_when_no_polygon():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], has_geolocation=False, polygon_coords=None)

    findings = farm_rules.missing_geolocation(ctx, settings())

    assert len(findings) == 1
    assert findings[0].severity == "critical"
    assert findings[0].entity_id == "farm-1"


def test_invalid_polygon_geometry_fires_on_degenerate_polygon():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_is_valid=False)

    findings = farm_rules.invalid_polygon_geometry(ctx, settings())

    assert len(findings) == 1
    assert findings[0].severity == "high"


def test_invalid_polygon_geometry_skips_farms_with_no_geolocation():
    """A farm with no polygon at all shouldn't double-fire this rule too —
    that's missing_geolocation's job."""
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], has_geolocation=False, polygon_is_valid=False)

    assert farm_rules.invalid_polygon_geometry(ctx, settings()) == []


def test_implausible_polygon_area_fires_below_floor():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_area_hectares=0.01)

    findings = farm_rules.implausible_polygon_area(ctx, settings())

    assert len(findings) == 1
    assert "small" in findings[0].title.lower()


def test_implausible_polygon_area_fires_above_ceiling():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_area_hectares=500.0)

    findings = farm_rules.implausible_polygon_area(ctx, settings())

    assert len(findings) == 1
    assert "large" in findings[0].title.lower()


def test_implausible_polygon_area_skips_when_area_unknown():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_area_hectares=None)

    assert farm_rules.implausible_polygon_area(ctx, settings()) == []


def test_duplicate_farm_geometry_fires_on_overlapping_squares():
    ctx = clean_context()
    farm_a = clean_farm(farm_id="farm-a")
    # farm-b's square is nearly identical to farm-a's -> high overlap
    farm_b = replace(
        clean_farm(farm_id="farm-b"),
        polygon_coords=[
            (6.5201, 3.3701), (6.5211, 3.3701), (6.5211, 3.3711), (6.5201, 3.3711),
        ],
    )
    ctx.farms = {"farm-a": farm_a, "farm-b": farm_b}

    findings = farm_rules.duplicate_farm_geometry(ctx, settings())

    assert len(findings) == 2  # one finding per farm in the overlapping pair
    assert {f.entity_id for f in findings} == {"farm-a", "farm-b"}
    assert all(f.severity == "critical" for f in findings)


def test_duplicate_farm_geometry_does_not_fire_on_distant_farms():
    ctx = clean_context()
    farm_a = clean_farm(farm_id="farm-a")
    farm_b = replace(
        clean_farm(farm_id="farm-b"),
        polygon_coords=[(7.0, 4.0), (7.001, 4.0), (7.001, 4.001), (7.0, 4.001)],
    )
    ctx.farms = {"farm-a": farm_a, "farm-b": farm_b}

    assert farm_rules.duplicate_farm_geometry(ctx, settings()) == []


def test_missing_farmer_link_fires_when_farmer_id_is_none():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], farmer_id=None)

    findings = farm_rules.missing_farmer_link(ctx, settings())

    assert len(findings) == 1
    assert findings[0].severity == "high"
