"""
Every rule is a plain function: AssessmentContext, Settings -> list[Finding].
No base class, no inheritance — a rule that needs no state is just a
function, and the registry in compliance_engine.py is a flat list of them.
This mirrors the strategy doc's own instruction (section 12): "use
deterministic rules wherever a regulation or data-quality constraint can
be expressed deterministically" — these ARE that layer, not a stand-in
for it.
"""
from collections.abc import Callable
from dataclasses import dataclass

from app.config import Settings
from app.services.rules.context import AssessmentContext


@dataclass(frozen=True)
class Finding:
    rule_id: str
    severity: str  # matches models.core.FindingSeverity values
    title: str
    message: str
    remediation: str
    entity_type: str
    entity_id: str


Rule = Callable[[AssessmentContext, Settings], list[Finding]]
