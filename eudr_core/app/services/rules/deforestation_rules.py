"""
Rule 21 — the EUDR question itself: was this plot deforested after
31 Dec 2020? Uses the latest screening of the farm's *current* boundary
(see services/deforestation.py). A redrawn boundary needs re-screening.
"""
from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def deforestation_risk(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    findings = []
    for farm in ctx.farms.values():
        if not farm.has_geolocation:
            continue  # farm.missing_geolocation already blocks
        risk = farm.deforestation_risk
        if risk == "high":
            findings.append(Finding(
                rule_id="farm.deforestation_risk",
                severity="critical",
                title="Plot shows deforestation after 2020",
                message=(
                    f"Satellite evidence for farm {farm.id} shows tree cover at the end of 2020 "
                    "and disturbance after it."
                ),
                remediation=(
                    "Do not ship cocoa from this plot to the EU unless a field check proves the "
                    "result wrong (e.g. the plot was already a cocoa farm before 2021). Record the evidence."
                ),
                entity_type="farm",
                entity_id=farm.id,
            ))
        elif risk == "more_info_needed":
            findings.append(Finding(
                rule_id="farm.deforestation_risk",
                severity="high",
                title="Plot needs proof it was farmland before 2021",
                message=(
                    f"Farm {farm.id} had tree cover at the end of 2020 and no dataset shows it as farmland "
                    "then. This is common for shade-grown cocoa but the buyer will ask."
                ),
                remediation=(
                    "Collect evidence the cocoa was planted before 2021: older photos, purchase records, "
                    "a dated land agreement or a farmer declaration, and upload it."
                ),
                entity_type="farm",
                entity_id=farm.id,
            ))
        elif risk is None:
            findings.append(Finding(
                rule_id="farm.deforestation_risk",
                severity="medium",
                title="Plot not screened for deforestation",
                message=f"Farm {farm.id} has no deforestation screening for its current boundary.",
                remediation="Run deforestation screening for this shipment's plots.",
                entity_type="farm",
                entity_id=farm.id,
            ))
    return findings


RULES = [deforestation_risk]
