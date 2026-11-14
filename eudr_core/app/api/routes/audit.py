from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import core as models
from app.permissions import has_permission
from app.schemas.core import AuditEventOut

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventOut])
def list_events(
    entity_id: str | None = Query(default=None, description="History of one record"),
    action: str | None = Query(default=None, description="Prefix, e.g. 'shipment' or 'auth.login'"),
    user_id: str | None = Query(default=None),
    before: datetime | None = Query(default=None, description="For paging: created_at of the last row you have"),
    limit: int = Query(default=50, ge=1, le=200),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Organization activity, newest first. Anyone can see the history of a
    single record (entity_id); the full feed needs the audit.view permission
    (admins and compliance reviewers), otherwise you see your own actions."""
    q = db.query(models.AuditEvent).filter(models.AuditEvent.organization_id == str(user.organization_id))
    if entity_id:
        q = q.filter(models.AuditEvent.entity_id == entity_id)
    elif not has_permission(user, "audit.view"):
        q = q.filter(models.AuditEvent.user_id == str(user.id))
    if action:
        q = q.filter(models.AuditEvent.action.like(f"{action}%"))
    if user_id:
        q = q.filter(models.AuditEvent.user_id == user_id)
    if before:
        q = q.filter(models.AuditEvent.created_at < before)
    return q.order_by(models.AuditEvent.created_at.desc()).limit(limit).all()
