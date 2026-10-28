from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def missing_collection_agent(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="collection.missing_agent",
            severity="medium",
            title="Collection event has no recorded agent",
            message=f"Collection event {c.id} on farm {c.farm_id} has no agent_user_id.",
            remediation="Identify which field agent performed this collection.",
            entity_type="collection_event",
            entity_id=c.id,
        )
        for c in ctx.collection_events.values()
        if c.agent_user_id is None
    ]


def missing_collection_location(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="collection.missing_location",
            severity="medium",
            title="Collection event has no recorded location",
            message=f"Collection event {c.id} on farm {c.farm_id} has no GPS location recorded.",
            remediation="Ensure the field app logs location at the time of collection.",
            entity_type="collection_event",
            entity_id=c.id,
        )
        for c in ctx.collection_events.values()
        if not c.location_recorded
    ]


def collection_weight_exceeds_harvest(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    """A farm can't hand over more product than it reported harvesting.
    When collected weight exceeds reported harvest weight by more than the
    tolerance, either the harvest was under-reported or product from
    elsewhere is being attributed to this farm — both are exactly what
    EUDR due diligence needs to catch."""
    findings = []
    farm_ids = {c.farm_id for c in ctx.collection_events.values()} | {
        h.farm_id for h in ctx.harvests
    }
    for farm_id in farm_ids:
        total_harvested = sum(h.quantity_kg for h in ctx.harvests_for_farm(farm_id))
        total_collected = sum(c.weight_kg for c in ctx.collections_for_farm(farm_id))
        allowed = total_harvested * (1 + settings.collection_over_harvest_tolerance_ratio)

        if total_harvested == 0 and total_collected > 0:
            findings.append(
                Finding(
                    rule_id="collection.weight_exceeds_harvest",
                    severity="critical",
                    title="Collected weight with no matching harvest record",
                    message=(
                        f"Farm {farm_id} has {total_collected:.1f} kg collected but no "
                        "recorded harvest at all."
                    ),
                    remediation="Record the harvest event this collection is drawing from.",
                    entity_type="farm",
                    entity_id=farm_id,
                )
            )
        elif total_collected > allowed:
            findings.append(
                Finding(
                    rule_id="collection.weight_exceeds_harvest",
                    severity="critical",
                    title="Collected weight exceeds reported harvest",
                    message=(
                        f"Farm {farm_id}: {total_collected:.1f} kg collected vs "
                        f"{total_harvested:.1f} kg harvested "
                        f"({settings.collection_over_harvest_tolerance_ratio:.0%} tolerance)."
                    ),
                    remediation=(
                        "Reconcile harvest and collection records for this farm before "
                        "including its output in a shipment."
                    ),
                    entity_type="farm",
                    entity_id=farm_id,
                )
            )
    return findings


RULES = [
    missing_collection_agent,
    missing_collection_location,
    collection_weight_exceeds_harvest,
]
