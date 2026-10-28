from dataclasses import replace

from app.config import Settings
from app.services.rules import collection_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_collection_has_no_findings():
    ctx = clean_context()
    assert collection_rules.missing_collection_agent(ctx, s) == []
    assert collection_rules.missing_collection_location(ctx, s) == []
    assert collection_rules.collection_weight_exceeds_harvest(ctx, s) == []


def test_missing_agent_fires():
    ctx = clean_context()
    ctx.collection_events["collection-1"] = replace(
        ctx.collection_events["collection-1"], agent_user_id=None
    )

    findings = collection_rules.missing_collection_agent(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "medium"


def test_missing_location_fires():
    ctx = clean_context()
    ctx.collection_events["collection-1"] = replace(
        ctx.collection_events["collection-1"], location_recorded=False
    )

    findings = collection_rules.missing_collection_location(ctx, s)

    assert len(findings) == 1


def test_collection_exceeding_harvest_fires():
    ctx = clean_context()
    # harvest is 500 kg, 10% tolerance -> 550 kg allowed; push collection to 600
    ctx.collection_events["collection-1"] = replace(
        ctx.collection_events["collection-1"], weight_kg=600
    )

    findings = collection_rules.collection_weight_exceeds_harvest(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "critical"
    assert findings[0].entity_id == "farm-1"


def test_collection_within_tolerance_does_not_fire():
    ctx = clean_context()
    # 500 kg harvest, 10% tolerance -> 549 kg is just inside the allowed band
    ctx.collection_events["collection-1"] = replace(
        ctx.collection_events["collection-1"], weight_kg=549
    )

    assert collection_rules.collection_weight_exceeds_harvest(ctx, s) == []


def test_collection_with_zero_harvest_fires_distinct_message():
    ctx = clean_context()
    ctx.harvests = []  # no harvest at all recorded for this farm

    findings = collection_rules.collection_weight_exceeds_harvest(ctx, s)

    assert len(findings) == 1
    assert "no matching harvest" in findings[0].title.lower()
