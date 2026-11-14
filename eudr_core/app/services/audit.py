"""
Append-only audit log.

Every create / change / delete of a tracked record is written to
`audit_events` automatically by a SQLAlchemy `before_flush` hook, in the
same transaction as the change itself — so there is no way to change data
through the API without leaving a trace, and no audit row without the
change. The actor comes from `session.info["actor"]`, set by
`get_current_user`. The database trigger in migration 0002 refuses UPDATE
and DELETE on the table.

Sign-ins, password changes and invitations aren't row changes, so routes
call `record()` for those directly.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.models import core as m

_SKIP_FIELDS = {"geometry", "password_hash", "session_version", "created_at", "uploaded_at", "last_login_at",
                "extracted_fields", "extraction_confidence", "computed_at", "updated_at",
                "done_count", "status_detail"}


def _label(obj) -> tuple[str, str]:
    """(entity_type, human description) for a tracked object."""
    if isinstance(obj, m.Farmer):
        return "farmer", f"farmer {obj.full_name}"
    if isinstance(obj, m.Farm):
        return "farm", f"farm {obj.name or str(obj.id)[:8]}"
    if isinstance(obj, m.Harvest):
        return "harvest", f"harvest of {obj.quantity_kg:,.0f} kg"
    if isinstance(obj, m.CollectionEvent):
        return "collection", f"collection of {obj.weight_kg:,.0f} kg"
    if isinstance(obj, m.Batch):
        return "batch", f"batch of {obj.output_kg:,.0f} kg"
    if isinstance(obj, m.Shipment):
        return "shipment", f"shipment {obj.reference or str(obj.id)[:8]}"
    if isinstance(obj, m.Document):
        dt = obj.document_type.value if hasattr(obj.document_type, "value") else obj.document_type
        return "document", f"document {obj.original_filename or str(dt).replace('_', ' ')}"
    if isinstance(obj, m.ComplianceAssessment):
        return "shipment", f"readiness check (score {obj.readiness_score}{', blocked' if obj.is_blocked else ''})"
    if isinstance(obj, m.ScreeningJob):
        return "screening", f"deforestation screening of {obj.farm_count} farm(s)"
    if isinstance(obj, m.User):
        return "user", f"team member {obj.name} ({obj.email})"
    if isinstance(obj, m.Organization):
        return "organization", f"organization {obj.name}"
    return obj.__class__.__name__.lower(), obj.__class__.__name__


_TRACKED = (m.Farmer, m.Farm, m.Harvest, m.CollectionEvent, m.Batch, m.Shipment, m.Document,
            m.ComplianceAssessment, m.ScreeningJob, m.User, m.Organization)


def _jsonable(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if hasattr(v, "value"):
        return v.value
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    return str(v)


def _changes(obj) -> dict:
    out = {}
    state = inspect(obj)
    for attr in state.mapper.column_attrs:
        if attr.key in _SKIP_FIELDS:
            continue
        hist = state.attrs[attr.key].history
        if hist.has_changes():
            old = hist.deleted[0] if hist.deleted else None
            new = hist.added[0] if hist.added else None
            if old != new:
                out[attr.key] = {"from": _jsonable(old), "to": _jsonable(new)}
    return out


def _org_id(obj, actor):
    org = getattr(obj, "organization_id", None)
    if org is None and isinstance(obj, m.Organization):
        org = obj.id
    if org is None and actor is not None:
        org = actor.organization_id
    return str(org) if org else None


def _event(session: Session, action: str, obj=None, summary: str = "", changes: dict | None = None,
           entity_type: str | None = None, entity_id: str | None = None, actor=None):
    actor = actor if actor is not None else session.info.get("actor")
    return m.AuditEvent(
        id=m._uuid(),
        organization_id=_org_id(obj, actor) if obj is not None else (str(actor.organization_id) if actor else None),
        user_id=str(actor.id) if actor else None,
        user_name=actor.name if actor else "System",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        changes=changes or None,
        ip=session.info.get("ip"),
    )


def record(session: Session, action: str, summary: str, *, actor=None, entity_type=None, entity_id=None,
           organization_id=None, changes=None):
    """Explicit event (sign-in, password change, invitation...)."""
    ev = _event(session, action, None, summary, changes, entity_type, entity_id, actor=actor)
    if organization_id:
        ev.organization_id = str(organization_id)
    session.add(ev)
    return ev


@event.listens_for(Session, "before_flush")
def _audit_before_flush(session: Session, flush_context, instances):
    if session.info.get("audit_disabled"):
        return
    events = []
    # Rows created earlier in this same transaction: a follow-up tweak (OCR
    # fields, computed totals) is part of "created", not a separate edit.
    created = session.info.setdefault("audit_created", set())
    for obj in list(session.new):
        if isinstance(obj, _TRACKED):
            if getattr(obj, "id", None) is None:
                obj.id = m._uuid()
            created.add(str(obj.id))
            et, desc = _label(obj)
            action = "assessment.run" if isinstance(obj, m.ComplianceAssessment) else (
                "screening.start" if isinstance(obj, m.ScreeningJob) else f"{et}.create")
            verb = "Ran" if action == "assessment.run" else ("Started" if action == "screening.start" else "Created")
            eid = str(obj.shipment_id) if isinstance(obj, m.ComplianceAssessment) else str(obj.id)
            events.append(_event(session, action, obj, f"{verb} {desc}", None, et, eid))
    for obj in list(session.dirty):
        if (isinstance(obj, _TRACKED) and not isinstance(obj, m.ScreeningJob) and str(obj.id) not in created
                and session.is_modified(obj)):
            changes = _changes(obj)
            if not changes:
                continue
            et, desc = _label(obj)
            if isinstance(obj, m.User) and "is_active" in changes:
                verb = "Reactivated" if changes["is_active"]["to"] else "Deactivated"
                action = "user.reactivate" if changes["is_active"]["to"] else "user.deactivate"
            else:
                verb, action = "Updated", f"{et}.update"
            fields = ", ".join(k.replace("_", " ") for k in changes)
            events.append(_event(session, action, obj, f"{verb} {desc} ({fields})", changes, et, str(obj.id)))
    for obj in list(session.deleted):
        if isinstance(obj, _TRACKED):
            et, desc = _label(obj)
            events.append(_event(session, f"{et}.delete", obj, f"Deleted {desc}", None, et, str(obj.id)))
    for ev in events:
        session.add(ev)


@event.listens_for(Session, "after_commit")
@event.listens_for(Session, "after_rollback")
def _audit_reset(session: Session):
    session.info.pop("audit_created", None)
