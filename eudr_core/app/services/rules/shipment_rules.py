from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def shipment_missing_destination_or_buyer(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    findings = []
    if not ctx.shipment.destination_country:
        findings.append(
            Finding(
                rule_id="shipment.missing_destination",
                severity="medium",
                title="Shipment has no destination country",
                message=f"Shipment {ctx.shipment.id} has no destination_country recorded.",
                remediation="Record the destination country for this shipment.",
                entity_type="shipment",
                entity_id=ctx.shipment.id,
            )
        )
    if not ctx.shipment.buyer_name:
        findings.append(
            Finding(
                rule_id="shipment.missing_buyer",
                severity="medium",
                title="Shipment has no buyer recorded",
                message=f"Shipment {ctx.shipment.id} has no buyer_name recorded.",
                remediation="Record the buyer this shipment is destined for.",
                entity_type="shipment",
                entity_id=ctx.shipment.id,
            )
        )
    return findings


def shipment_traceability_incomplete(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    """A rollup, distinct from the per-batch checks in batch_rules.py — this
    is the single number the exporter dashboard shows for 'can this
    shipment prove where every kilogram came from', matching the strategy
    doc's target metric (section 13): 100% of shipment inputs traceable
    or explicitly flagged."""
    shipment_batches = [
        ctx.batches[bid] for bid in ctx.shipment.batch_ids if bid in ctx.batches
    ]
    if not shipment_batches:
        return [
            Finding(
                rule_id="shipment.traceability_incomplete",
                severity="critical",
                title="Shipment has no linked batches",
                message=f"Shipment {ctx.shipment.id} has no batches attached at all.",
                remediation="Link at least one batch to this shipment before assessing readiness.",
                entity_type="shipment",
                entity_id=ctx.shipment.id,
            )
        ]

    untraceable = [b for b in shipment_batches if not b.input_collection_event_ids]
    if untraceable:
        return [
            Finding(
                rule_id="shipment.traceability_incomplete",
                severity="critical",
                title="Shipment includes batches with no traceable origin",
                message=(
                    f"{len(untraceable)} of {len(shipment_batches)} batches in shipment "
                    f"{ctx.shipment.id} have no linked collection events."
                ),
                remediation="Trace and link the missing batches' origins before this shipment can be marked ready.",
                entity_type="shipment",
                entity_id=ctx.shipment.id,
            )
        ]
    return []


RULES = [shipment_missing_destination_or_buyer, shipment_traceability_incomplete]
