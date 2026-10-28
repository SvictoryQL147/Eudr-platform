from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def missing_harvest_date(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="harvest.missing_date",
            severity="medium",
            title="Harvest has no recorded date",
            message=f"Harvest {harvest.id} on farm {harvest.farm_id} has no harvest_date.",
            remediation="Record the date this harvest was picked.",
            entity_type="harvest",
            entity_id=harvest.id,
        )
        for harvest in ctx.harvests
        if harvest.harvest_date is None
    ]


def harvest_date_in_future(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    today = ctx.evaluated_at.date()
    return [
        Finding(
            rule_id="harvest.date_in_future",
            severity="high",
            title="Harvest date is in the future",
            message=f"Harvest {harvest.id} is dated {harvest.harvest_date}, after today ({today}).",
            remediation="Correct the recorded harvest date — likely a data-entry error.",
            entity_type="harvest",
            entity_id=harvest.id,
        )
        for harvest in ctx.harvests
        if harvest.harvest_date is not None and harvest.harvest_date > today
    ]


def implausible_yield(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    """Flags a harvest quantity that implies an implausible yield per
    hectare for the farm it's attributed to — a common signature of
    volume being funneled through a farm that didn't actually produce it
    ("cocoa laundering"). `max_cocoa_yield_kg_per_hectare` is a single
    harvest-event ceiling, not an annual yield figure — tune it against
    your actual harvest reporting cadence (per-visit vs per-season)
    before trusting it as a hard gate."""
    findings = []
    for harvest in ctx.harvests:
        farm = ctx.farms.get(harvest.farm_id)
        if farm is None or not farm.polygon_area_hectares or farm.polygon_area_hectares <= 0:
            continue
        yield_kg_per_ha = harvest.quantity_kg / farm.polygon_area_hectares
        if yield_kg_per_ha > settings.max_cocoa_yield_kg_per_hectare:
            findings.append(
                Finding(
                    rule_id="harvest.implausible_yield",
                    severity="high",
                    title="Harvest quantity implausible for farm size",
                    message=(
                        f"Harvest {harvest.id} implies {yield_kg_per_ha:.0f} kg/ha on farm "
                        f"{farm.id} ({farm.polygon_area_hectares:.2f} ha), above the "
                        f"{settings.max_cocoa_yield_kg_per_hectare:.0f} kg/ha threshold."
                    ),
                    remediation=(
                        "Verify this harvest quantity against the farm's actual size and "
                        "planting density before accepting it into a batch."
                    ),
                    entity_type="harvest",
                    entity_id=harvest.id,
                )
            )
    return findings


RULES = [missing_harvest_date, harvest_date_in_future, implausible_yield]
