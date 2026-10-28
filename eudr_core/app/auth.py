"""
Authentication and tenant scoping.

Every request from the dashboard carries a JWT (Authorization: Bearer ...).
`get_current_user` resolves it to a User row, and every route then scopes
its queries to `user.organization_id` — one exporter can never read or
write another exporter's farmers, farms, batches or shipments.

`get_owned` is the one helper routes use to load an org-owned row by id:
it returns 404 (not 403) for rows belonging to another organization, so
the API never confirms that someone else's id exists.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user: models.User, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "org": str(user.organization_id),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> models.User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not signed in or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise unauthorized
    user = db.get(models.User, payload.get("sub"))
    if user is None or not user.is_active:
        raise unauthorized
    return user


def require_roles(*roles: models.UserRole):
    def _checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Your role can't do this")
        return user

    return _checker


def get_owned(db: Session, model, entity_id: str, user: models.User, label: str):
    """Load an org-owned row or 404. Works for any model with
    organization_id; for Harvest/CollectionEvent (scoped through their
    farm) use get_owned_via_farm."""
    try:
        obj = db.get(model, entity_id)
    except Exception:  # malformed UUID etc.
        obj = None
    if obj is None or str(obj.organization_id) != str(user.organization_id):
        raise HTTPException(status_code=404, detail=f"{label} {entity_id} not found")
    return obj


def get_owned_via_farm(db: Session, model, entity_id: str, user: models.User, label: str):
    try:
        obj = db.get(model, entity_id)
    except Exception:
        obj = None
    if obj is None or obj.farm is None or str(obj.farm.organization_id) != str(user.organization_id):
        raise HTTPException(status_code=404, detail=f"{label} {entity_id} not found")
    return obj
