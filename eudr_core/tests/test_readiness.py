from app.config import Settings
from app.services.readiness import compute_readiness
from app.services.rules.base import Finding

s = Settings()


def make_finding(severity: str, rule_id: str = "test.rule") -> Finding:
    return Finding(
        rule_id=rule_id, severity=severity, title="t", message="m",
        remediation="r", entity_type="farm", entity_id="f1",
    )


def test_no_findings_scores_100_and_not_blocked():
    result = compute_readiness([], s)
    assert result.score == 100
    assert result.is_blocked is False


def test_single_critical_blocks_regardless_of_score():
    result = compute_readiness([make_finding("critical")], s)
    assert result.is_blocked is True
    assert result.score == 60  # 100 - 40


def test_score_floors_at_zero_not_negative():
    findings = [make_finding("critical") for _ in range(5)]  # 5 * 40 = 200 deduction
    result = compute_readiness(findings, s)
    assert result.score == 0
    assert result.is_blocked is True


def test_only_low_and_medium_findings_do_not_block():
    findings = [make_finding("medium"), make_finding("low")]
    result = compute_readiness(findings, s)
    assert result.is_blocked is False
    assert result.score == 85  # 100 - 10 - 5


def test_findings_by_severity_groups_correctly():
    findings = [make_finding("critical"), make_finding("high"), make_finding("high")]
    result = compute_readiness(findings, s)
    grouped = result.findings_by_severity()
    assert len(grouped["critical"]) == 1
    assert len(grouped["high"]) == 2
    assert grouped["medium"] == []
    assert grouped["low"] == []
