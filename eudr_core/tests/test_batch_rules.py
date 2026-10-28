from dataclasses import replace

from app.config import Settings
from app.services.rules import batch_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_batch_has_no_findings():
    ctx = clean_context()
    assert batch_rules.batch_missing_inputs(ctx, s) == []
    assert batch_rules.batch_quantity_mismatch(ctx, s) == []
    assert batch_rules.batch_input_farm_not_verified(ctx, s) == []


def test_missing_inputs_fires():
    ctx = clean_context()
    ctx.batches["batch-1"] = replace(
        ctx.batches["batch-1"], input_collection_event_ids=[], input_total_kg=0, input_farm_ids=[]
    )

    findings = batch_rules.batch_missing_inputs(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "critical"


def test_quantity_mismatch_fires_beyond_tolerance():
    ctx = clean_context()
    # output 480, tolerance 5% -> allowed input band [456, 504]; push input way outside
    ctx.batches["batch-1"] = replace(ctx.batches["batch-1"], input_total_kg=300)

    findings = batch_rules.batch_quantity_mismatch(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "critical"


def test_quantity_mismatch_within_tolerance_does_not_fire():
    ctx = clean_context()
    # 480 output, 3% deviation is within the 5% default tolerance
    ctx.batches["batch-1"] = replace(ctx.batches["batch-1"], input_total_kg=466)

    assert batch_rules.batch_quantity_mismatch(ctx, s) == []


def test_quantity_mismatch_skips_batches_with_no_inputs():
    """Already covered by batch_missing_inputs — shouldn't double-fire."""
    ctx = clean_context()
    ctx.batches["batch-1"] = replace(
        ctx.batches["batch-1"], input_collection_event_ids=[], input_total_kg=0
    )

    assert batch_rules.batch_quantity_mismatch(ctx, s) == []


def test_input_farm_not_verified_fires_when_source_farm_unmapped():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], has_geolocation=False)

    findings = batch_rules.batch_input_farm_not_verified(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "high"
    assert findings[0].entity_id == "batch-1"
