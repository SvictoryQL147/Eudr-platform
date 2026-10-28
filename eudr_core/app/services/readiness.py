"""
Turns a flat list of Findings into the single number and blocking flag the
exporter dashboard shows — the strategy doc's "EUDR Readiness Score"
(section 6, differentiator #2): "one score backed by explainable checks,
with every failure linked to a concrete remediation task." The
remediation task is already on each Finding; this module just does the
rollup.
"""
from dataclasses import dataclass

from app.config import Settings
from app.services.rules.base import Finding

_SEVERITY_ORDER = ["critical", "high", "medium", "low"]


@dataclass
class ReadinessResult:
    score: int  # 0-100
    is_blocked: bool  # True if any open CRITICAL finding — shipment cannot be marked ready
    findings: list[Finding]

    def findings_by_severity(self) -> dict[str, list[Finding]]:
        return {
            severity: [f for f in self.findings if f.severity == severity]
            for severity in _SEVERITY_ORDER
        }


def compute_readiness(findings: list[Finding], settings: Settings) -> ReadinessResult:
    weights = {
        "critical": settings.severity_weight_critical,
        "high": settings.severity_weight_high,
        "medium": settings.severity_weight_medium,
        "low": settings.severity_weight_low,
    }
    total_deduction = sum(weights.get(f.severity, 0) for f in findings)
    score = max(0, 100 - total_deduction)
    is_blocked = any(f.severity == "critical" for f in findings)

    return ReadinessResult(score=score, is_blocked=is_blocked, findings=findings)
