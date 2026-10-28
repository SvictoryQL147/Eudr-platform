from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def batch_missing_inputs(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="batch.missing_inputs",
            severity="critical",
            title="Batch has no linked collection events",
            message=f"Batch {batch.id} has {batch.output_kg:.1f} kg output but zero linked inputs.",
            remediation="Link this batch's output to the collection events that fed it.",
            entity_type="batch",
            entity_id=batch.id,
        )
        for batch in ctx.batches.values()
        if not batch.input_collection_event_ids
    ]


def batch_quantity_mismatch(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    """The single most important anti-fraud check in the whole engine:
    does the batch's output roughly equal the sum of what fed into it.
    A batch that outputs meaningfully more than its recorded inputs is
    exactly how untraceable volume enters a supply chain."""
    findings = []
    for batch in ctx.batches.values():
        if not batch.input_collection_event_ids:
            continue  # already covered by batch_missing_inputs
        if batch.output_kg <= 0:
            continue
        deviation_ratio = abs(batch.input_total_kg - batch.output_kg) / batch.output_kg
        if deviation_ratio > settings.batch_quantity_tolerance_ratio:
            findings.append(
                Finding(
                    rule_id="batch.quantity_mismatch",
                    severity="critical",
                    title="Batch output does not match summed inputs",
                    message=(
                        f"Batch {batch.id}: {batch.input_total_kg:.1f} kg of inputs vs "
                        f"{batch.output_kg:.1f} kg output "
                        f"({deviation_ratio:.1%} deviation, "
                        f"{settings.batch_quantity_tolerance_ratio:.0%} tolerance)."
                    ),
                    remediation="Reconcile input and output weights for this batch before shipping.",
                    entity_type="batch",
                    entity_id=batch.id,
                )
            )
    return findings


def batch_input_farm_not_verified(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    findings = []
    for batch in ctx.batches.values():
        unverified_farm_ids = [
            farm_id
            for farm_id in batch.input_farm_ids
            if (farm := ctx.farms.get(farm_id)) is not None and not farm.has_geolocation
        ]
        for farm_id in unverified_farm_ids:
            findings.append(
                Finding(
                    rule_id="batch.input_farm_not_verified",
                    severity="high",
                    title="Batch includes input from an unmapped farm",
                    message=f"Batch {batch.id} includes input from farm {farm_id}, which has no geolocation.",
                    remediation=f"Map farm {farm_id}'s boundary before this batch can be considered traceable.",
                    entity_type="batch",
                    entity_id=batch.id,
                )
            )
    return findings


RULES = [batch_missing_inputs, batch_quantity_mismatch, batch_input_farm_not_verified]
