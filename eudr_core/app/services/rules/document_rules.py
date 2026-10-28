from app.config import Settings
from app.services.rules.base import Finding
from app.services.rules.context import AssessmentContext


def missing_required_shipment_document(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    export_docs = ctx.documents_for("shipment", ctx.shipment.id)
    has_export_certificate = any(d.document_type == "export_certificate" for d in export_docs)

    if has_export_certificate:
        return []
    return [
        Finding(
            rule_id="document.missing_required_shipment_document",
            severity="critical",
            title="Shipment has no export certificate on file",
            message=f"Shipment {ctx.shipment.id} has no export_certificate document attached.",
            remediation="Upload the export certificate before this shipment can be marked ready.",
            entity_type="shipment",
            entity_id=ctx.shipment.id,
        )
    ]


def expired_document(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    today = ctx.evaluated_at.date()
    return [
        Finding(
            rule_id="document.expired",
            severity="high",
            title="Document has expired",
            message=(
                f"Document {doc.id} ({doc.document_type}) linked to {doc.linked_to_type} "
                f"{doc.linked_to_id} expired on {doc.expiry_date}."
            ),
            remediation="Obtain and upload a current version of this document.",
            entity_type="document",
            entity_id=doc.id,
        )
        for doc in ctx.documents
        if doc.expiry_date is not None and doc.expiry_date < today
    ]


RULES = [missing_required_shipment_document, expired_document]
