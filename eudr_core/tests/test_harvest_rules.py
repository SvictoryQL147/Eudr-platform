from dataclasses import replace
from datetime import date

from app.config import Settings
from app.services.rules import harvest_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_harvest_has_no_findings():
    ctx = clean_context()
    assert harvest_rules.missing_harvest_date(ctx, s) == []
    assert harvest_rules.harvest_date_in_future(ctx, s) == []
    assert harvest_rules.implausible_yield(ctx, s) == []


def test_missing_harvest_date_fires():
    ctx = clean_context()
    ctx.harvests[0] = replace(ctx.harvests[0], harvest_date=None)

    findings = harvest_rules.missing_harvest_date(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "medium"


def test_harvest_date_in_future_fires():
    ctx = clean_context()
    ctx.harvests[0] = replace(ctx.harvests[0], harvest_date=date(2027, 1, 1))  # after evaluated_at

    findings = harvest_rules.harvest_date_in_future(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "high"


def test_harvest_date_in_future_does_not_fire_when_date_is_none():
    ctx = clean_context()
    ctx.harvests[0] = replace(ctx.harvests[0], harvest_date=None)

    assert harvest_rules.harvest_date_in_future(ctx, s) == []


def test_implausible_yield_fires_for_overloaded_small_farm():
    ctx = clean_context()
    # 0.1 ha farm claiming 500 kg -> 5000 kg/ha, way above the 1200 default ceiling
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_area_hectares=0.1)

    findings = harvest_rules.implausible_yield(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "high"


def test_implausible_yield_skips_when_farm_area_unknown():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], polygon_area_hectares=None)

    assert harvest_rules.implausible_yield(ctx, s) == []
