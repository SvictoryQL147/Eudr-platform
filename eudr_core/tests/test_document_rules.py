from dataclasses import replace
from datetime import date

from app.config import Settings
from app.services.rules import document_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_documents_have_no_findings():
    ctx = clean_context()
    assert document_rules.missing_required_shipment_document(ctx, s) == []
    assert document_rules.expired_document(ctx, s) == []


def test_missing_export_certificate_fires():
    ctx = clean_context()
    ctx.documents = []

    findings = document_rules.missing_required_shipment_document(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "critical"


def test_non_certificate_document_does_not_satisfy_the_requirement():
    ctx = clean_context()
    ctx.documents[0] = replace(ctx.documents[0], document_type="purchase_receipt")

    findings = document_rules.missing_required_shipment_document(ctx, s)

    assert len(findings) == 1


def test_expired_document_fires():
    ctx = clean_context()
    ctx.documents[0] = replace(ctx.documents[0], expiry_date=date(2025, 1, 1))  # before evaluated_at

    findings = document_rules.expired_document(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "high"


def test_document_with_no_expiry_does_not_fire():
    ctx = clean_context()
    ctx.documents[0] = replace(ctx.documents[0], expiry_date=None)

    assert document_rules.expired_document(ctx, s) == []
