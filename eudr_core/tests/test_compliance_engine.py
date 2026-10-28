from app.config import Settings
from app.services.compliance_engine import ALL_RULES, run_all_rules
from app.services.readiness import compute_readiness
from tests.fixtures import clean_context

s = Settings()


def test_exactly_twenty_one_rules_are_registered():
    """20 deterministic data-quality rules from the 30-day plan, plus
    rule 21 (farm.deforestation_risk) added with Whisp screening. This
    test is a tripwire: if someone adds or removes a rule without meaning
    to, this fails and says so explicitly rather than the count silently
    drifting."""
    assert len(ALL_RULES) == 21, (
        f"Expected exactly 21 registered rules (20 data-quality + deforestation), "
        f"found {len(ALL_RULES)}. Update this test deliberately if the rule set "
        f"is meant to grow."
    )


def test_clean_shipment_passes_every_rule():
    ctx = clean_context()
    findings = run_all_rules(ctx, s)
    assert findings == []


def test_clean_shipment_reads_as_fully_ready():
    ctx = clean_context()
    findings = run_all_rules(ctx, s)
    result = compute_readiness(findings, s)
    assert result.score == 100
    assert result.is_blocked is False


def test_a_single_broken_field_produces_exactly_the_expected_finding():
    """Sanity check that rules are properly isolated from each other —
    breaking one specific thing shouldn't cascade into unrelated findings
    from other rule modules."""
    from dataclasses import replace

    ctx = clean_context()
    ctx.farmers["farmer-1"] = replace(ctx.farmers["farmer-1"], has_phone_number=False)

    findings = run_all_rules(ctx, s)

    assert len(findings) == 1
    assert findings[0].rule_id == "farmer.missing_contact_info"
