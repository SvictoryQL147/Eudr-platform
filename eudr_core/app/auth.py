"""
Authentication and tenant scoping.

Sessions: the dashboard signs in and receives an httpOnly cookie that
JavaScript can't read. API clients can still send the same JWT as an
`Authorization: Bearer` header. Cookie-authenticated writes must carry an
`X-Requested-With` header — browsers won't add custom headers to
cross-site form posts, so this blocks CSRF on top of SameSite=Lax.

Each token carries the user's `session_version`; changing or resetting a
password bumps it, which ends every other session at once.

`get_owned` loads an org-owned row by id and returns 404 (not 403) for
rows belonging to another organization, so the API never confirms that
someone else's id exists.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models

_bearer = HTTPBearer(auto_error=False)
CSRF_HEADER = "x-requested-with"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# A real hash to compare against when the email doesn't exist, so a wrong
# email takes as long as a wrong password (no account enumeration by timing).
_DUMMY_HASH = hash_password("timing-equaliser-not-a-password")


def check_password_or_dummy(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, password_hash)


def create_access_token(user: models.User, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "org": str(user.organization_id),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "sv": int(user.session_version or 0),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _cookie_secure(settings: Settings) -> bool:
    return settings.app_url.lower().startswith("https://")


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.jwt_expires_minutes * 60,
        httponly=True,
        secure=_cookie_secure(settings),
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(settings.cookie_name, path="/", httponly=True, secure=_cookie_secure(settings), samesite="lax")


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host[:64] if request.client else None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> models.User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not signed in or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials if credentials else None
    from_cookie = False
    if token is None:
        token = request.cookies.get(settings.cookie_name)
        from_cookie = token is not None
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise unauthorized
    try:
        user = db.get(models.User, payload.get("sub"))
    except Exception:
        user = None
    if user is None or not user.is_active or int(payload.get("sv", 0)) != int(user.session_version or 0):
        raise unauthorized
    if from_cookie and request.method not in _SAFE_METHODS and not request.headers.get(CSRF_HEADER):
        raise HTTPException(status_code=403, detail="Missing X-Requested-With header")
    # The audit log reads the actor from here (see services/audit.py).
    db.info["actor"] = user
    db.info["ip"] = client_ip(request)
    return user


def require_roles(*roles: models.UserRole):
    def _checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Your role can't do this")
        return user

    return _checker


# --- One-time tokens (password reset, invitations) -------------------------


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_token(db: Session, user: models.User, purpose: str, ttl: timedelta) -> str:
    """Creates a single-use token and returns the raw value (only its hash
    is stored). Older unused tokens for the same purpose are retired."""
    now = datetime.now(timezone.utc)
    db.query(models.AuthToken).filter(
        models.AuthToken.user_id == user.id,
        models.AuthToken.purpose == purpose,
        models.AuthToken.used_at.is_(None),
    ).update({models.AuthToken.used_at: now}, synchronize_session=False)
    raw = secrets.token_urlsafe(32)
    db.add(models.AuthToken(user_id=user.id, purpose=purpose, token_hash=_hash_token(raw), expires_at=now + ttl))
    return raw


def find_token(db: Session, raw: str, purpose: str) -> models.AuthToken | None:
    if not raw:
        return None
    tok = db.query(models.AuthToken).filter(models.AuthToken.token_hash == _hash_token(raw)).first()
    if tok is None or tok.purpose != purpose or tok.used_at is not None:
        return None
    if tok.expires_at < datetime.now(timezone.utc):
        return None
    return tok


# --- Tenant scoping -----------------------------------------------------------


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
