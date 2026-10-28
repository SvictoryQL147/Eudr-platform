from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def missing_farmer_id_document(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="farmer.missing_id_document",
            severity="high",
            title="Farmer has no identity document on file",
            message=f"Farmer {farmer.id} has no national ID recorded.",
            remediation="Collect and record the farmer's national ID number.",
            entity_type="farmer",
            entity_id=farmer.id,
        )
        for farmer in ctx.farmers.values()
        if not farmer.has_national_id
    ]


def missing_farmer_contact_info(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    return [
        Finding(
            rule_id="farmer.missing_contact_info",
            severity="low",
            title="Farmer has no phone number on file",
            message=f"Farmer {farmer.id} has no phone number recorded.",
            remediation="Collect a phone number for follow-up and verification calls.",
            entity_type="farmer",
            entity_id=farmer.id,
        )
        for farmer in ctx.farmers.values()
        if not farmer.has_phone_number
    ]


RULES = [missing_farmer_id_document, missing_farmer_contact_info]
