from dataclasses import replace

from app.config import Settings
from app.services.rules import farmer_rules
from tests.fixtures import clean_context

s = Settings()


def test_clean_farmer_has_no_findings():
    ctx = clean_context()
    assert farmer_rules.missing_farmer_id_document(ctx, s) == []
    assert farmer_rules.missing_farmer_contact_info(ctx, s) == []


def test_missing_id_document_fires():
    ctx = clean_context()
    ctx.farmers["farmer-1"] = replace(ctx.farmers["farmer-1"], has_national_id=False)

    findings = farmer_rules.missing_farmer_id_document(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "high"


def test_missing_contact_info_fires():
    ctx = clean_context()
    ctx.farmers["farmer-1"] = replace(ctx.farmers["farmer-1"], has_phone_number=False)

    findings = farmer_rules.missing_farmer_contact_info(ctx, s)

    assert len(findings) == 1
    assert findings[0].severity == "low"
