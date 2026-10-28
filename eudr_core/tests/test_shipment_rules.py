from dataclasses import replace

from app.config import Settings
from app.services.rules import shipment_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_shipment_has_no_findings():
    ctx = clean_context()
    assert shipment_rules.shipment_missing_destination_or_buyer(ctx, s) == []
    assert shipment_rules.shipment_traceability_incomplete(ctx, s) == []


def test_missing_destination_fires():
    ctx = clean_context()
    ctx.shipment = replace(ctx.shipment, destination_country=None)

    findings = shipment_rules.shipment_missing_destination_or_buyer(ctx, s)

    assert len(findings) == 1
    assert findings[0].rule_id == "shipment.missing_destination"


def test_missing_buyer_fires():
    ctx = clean_context()
    ctx.shipment = replace(ctx.shipment, buyer_name=None)

    findings = shipment_rules.shipment_missing_destination_or_buyer(ctx, s)

    assert len(findings) == 1
    assert findings[0].rule_id == "shipment.missing_buyer"


def test_missing_both_fires_two_findings():
    ctx = clean_context()
    ctx.shipment = replace(ctx.shipment, destination_country=None, buyer_name=None)

    findings = shipment_rules.shipment_missing_destination_or_buyer(ctx, s)

    assert len(findings) == 2


def test_traceability_incomplete_fires_when_batch_has_no_inputs():
    ctx = clean_context()
    ctx.batches["batch-1"] = replace(
        ctx.batches["batch-1"], input_collection_event_ids=[], input_total_kg=0
    )

    findings = shipment_rules.shipment_traceability_incomplete(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "critical"


def test_traceability_incomplete_fires_when_shipment_has_no_batches():
    ctx = clean_context()
    ctx.shipment = replace(ctx.shipment, batch_ids=[])

    findings = shipment_rules.shipment_traceability_incomplete(ctx, s)

    assert len(findings) == 1
    assert "no batches" in findings[0].message.lower()
