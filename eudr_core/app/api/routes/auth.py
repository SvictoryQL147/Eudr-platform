from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    check_password_or_dummy,
    clear_session_cookie,
    client_ip,
    create_access_token,
    find_token,
    get_current_user,
    hash_password,
    issue_token,
    set_session_cookie,
    verify_password,
)
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models
from app.permissions import ROLE_LABELS, permissions_for, require
from app.schemas.core import (
    AcceptInviteIn,
    ChangePasswordIn,
    ForgotPasswordIn,
    InviteIn,
    InviteInfoOut,
    InviteOut,
    LoginIn,
    MeOut,
    OrganizationOut,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.services import audit, email
from app.services.rate_limit import check_login_allowed, check_reset_allowed, record_attempt

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
users_router = APIRouter(prefix="/api/v1/users", tags=["users"])

RESET_TTL = timedelta(hours=1)
INVITE_TTL = timedelta(days=7)


def _pending_invites(db: Session, user_ids: list[str]) -> set[str]:
    if not user_ids:
        return set()
    rows = (db.query(models.AuthToken.user_id)
            .filter(models.AuthToken.user_id.in_(user_ids), models.AuthToken.purpose == "invite",
                    models.AuthToken.used_at.is_(None), models.AuthToken.expires_at > datetime.now(timezone.utc)).all())
    return {str(r[0]) for r in rows}


def _user_out(u: models.User, pending: set[str] | None = None) -> UserOut:
    out = UserOut.model_validate(u)
    out.has_login = u.password_hash is not None
    out.invite_pending = pending is not None and str(u.id) in pending
    return out


def _check_password_strength(password: str, settings: Settings, email_addr: str = "") -> None:
    if len(password) < settings.password_min_length:
        raise HTTPException(status_code=422, detail=f"Use at least {settings.password_min_length} characters")
    if password.lower() in {"password123", "1234567890", "qwertyuiop", "eudrexport", "alatrace123"}:
        raise HTTPException(status_code=422, detail="That password is too common")
    if email_addr and password.lower() == email_addr.lower():
        raise HTTPException(status_code=422, detail="Don't use your email as your password")


def _signed_in(user: models.User, db: Session, settings: Settings, response: Response) -> TokenOut:
    token = create_access_token(user, settings)
    set_session_cookie(response, token, settings)
    org = db.get(models.Organization, user.organization_id)
    return TokenOut(
        access_token=token,
        user=_user_out(user),
        organization=OrganizationOut.model_validate(org),
        permissions=permissions_for(user.role),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db),
             settings: Settings = Depends(get_settings)):
    """Creates a new organization (an exporter, aggregator or cooperative)
    and its first admin user, and signs them in."""
    _check_password_strength(payload.password, settings, payload.email)
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    db.info["ip"] = client_ip(request)
    org = models.Organization(name=payload.organization_name.strip())
    db.add(org)
    db.flush()
    user = models.User(
        organization_id=org.id,
        name=payload.name.strip(),
        email=payload.email,
        role=models.UserRole.ADMIN,
        password_hash=hash_password(payload.password),
        is_active=True,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    db.info["actor"] = user
    db.commit()
    db.refresh(user)
    return _signed_in(user, db, settings, response)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db),
          settings: Settings = Depends(get_settings)):
    email_addr = payload.email.strip().lower()
    ip = client_ip(request)
    db.info["ip"] = ip
    check_login_allowed(db, settings, email_addr, ip)
    user = db.query(models.User).filter(models.User.email == email_addr).first()
    ok = check_password_or_dummy(payload.password, user.password_hash if user else None)
    if not ok or user is None or not user.is_active:
        record_attempt(db, email_addr, ip, "login", False)
        db.commit()
        raise HTTPException(status_code=401, detail="Wrong email or password")
    record_attempt(db, email_addr, ip, "login", True)
    db.info["audit_disabled"] = True  # last_login_at isn't worth an "updated" row
    user.last_login_at = datetime.now(timezone.utc)
    db.flush()
    db.info["audit_disabled"] = False
    audit.record(db, "auth.login", "Signed in", actor=user, entity_type="user", entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return _signed_in(user, db, settings, response)


@router.post("/logout", status_code=204)
def logout(settings: Settings = Depends(get_settings)):
    out = Response(status_code=204)
    clear_session_cookie(out, settings)
    return out


@router.post("/logout-everywhere", status_code=204)
def logout_everywhere(user: models.User = Depends(get_current_user),
                      db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    db.info["audit_disabled"] = True
    user.session_version = (user.session_version or 0) + 1
    db.flush()
    db.info["audit_disabled"] = False
    audit.record(db, "auth.logout_all", "Signed out of every device", entity_type="user", entity_id=str(user.id))
    db.commit()
    out = Response(status_code=204)
    clear_session_cookie(out, settings)
    return out


@router.get("/me", response_model=MeOut)
def me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(models.Organization, user.organization_id)
    return MeOut(user=_user_out(user), organization=OrganizationOut.model_validate(org),
                 permissions=permissions_for(user.role))


@router.post("/change-password", response_model=TokenOut)
def change_password(payload: ChangePasswordIn, response: Response, user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Your current password is wrong")
    _check_password_strength(payload.new_password, settings, user.email)
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(status_code=422, detail="Choose a password you haven't used here")
    db.info["audit_disabled"] = True
    user.password_hash = hash_password(payload.new_password)
    user.session_version = (user.session_version or 0) + 1  # ends other sessions
    db.flush()
    db.info["audit_disabled"] = False
    audit.record(db, "auth.password_change", "Changed their password", entity_type="user", entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return _signed_in(user, db, settings, response)  # keep this browser signed in


@router.post("/forgot-password", status_code=202)
def forgot_password(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db),
                    settings: Settings = Depends(get_settings)):
    """Always answers the same way, whether or not the email has an account,
    so this can't be used to find out who's a customer."""
    email_addr = payload.email.strip().lower()
    ip = client_ip(request)
    db.info["ip"] = ip
    generic = {"detail": "If that email has an account, a reset link is on its way."}
    if not check_reset_allowed(db, settings, email_addr, ip):
        return generic
    record_attempt(db, email_addr, ip, "reset", True)
    user = db.query(models.User).filter(models.User.email == email_addr).first()
    if user is not None and user.is_active and user.password_hash:
        raw = issue_token(db, user, "reset", RESET_TTL)
        audit.record(db, "auth.reset_requested", "Asked for a password reset link", actor=user,
                     entity_type="user", entity_id=str(user.id))
        db.commit()
        email.send_password_reset(settings, user.email, user.name, f"{settings.app_url.rstrip('/')}/reset-password?token={raw}")
    else:
        db.commit()
    return generic


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, request: Request, db: Session = Depends(get_db),
                   settings: Settings = Depends(get_settings)):
    tok = find_token(db, payload.token, "reset")
    if tok is None:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Ask for a new one.")
    user = db.get(models.User, tok.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Ask for a new one.")
    _check_password_strength(payload.password, settings, user.email)
    db.info.update(ip=client_ip(request), audit_disabled=True)
    tok.used_at = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.password)
    user.session_version = (user.session_version or 0) + 1
    db.flush()
    db.info["audit_disabled"] = False
    audit.record(db, "auth.password_reset", "Reset their password with an emailed link", actor=user, entity_type="user", entity_id=str(user.id))
    db.commit()
    return {"detail": "Password updated. Sign in with your new password."}


@router.get("/invite/{token}", response_model=InviteInfoOut)
def invite_info(token: str, db: Session = Depends(get_db)):
    tok = find_token(db, token, "invite")
    user = db.get(models.User, tok.user_id) if tok else None
    if user is None or not user.is_active:
        raise HTTPException(status_code=404, detail="This invitation is invalid or has expired. Ask your admin to resend it.")
    org = db.get(models.Organization, user.organization_id)
    return InviteInfoOut(email=user.email, name=user.name, organization_name=org.name, role=ROLE_LABELS[user.role])


@router.post("/accept-invite", response_model=TokenOut)
def accept_invite(payload: AcceptInviteIn, request: Request, response: Response, db: Session = Depends(get_db),
                  settings: Settings = Depends(get_settings)):
    tok = find_token(db, payload.token, "invite")
    user = db.get(models.User, tok.user_id) if tok else None
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="This invitation is invalid or has expired. Ask your admin to resend it.")
    _check_password_strength(payload.password, settings, user.email)
    db.info.update(ip=client_ip(request), audit_disabled=True)
    tok.used_at = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.password)
    user.last_login_at = datetime.now(timezone.utc)
    db.flush()
    db.info["audit_disabled"] = False
    audit.record(db, "user.invite_accepted", "Accepted their invitation and joined", actor=user, entity_type="user", entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return _signed_in(user, db, settings, response)


# --- Team ----------------------------------------------------------------------


def _parse_role(role: str) -> models.UserRole:
    try:
        return models.UserRole(role)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown role {role}")


def _send_invite(db: Session, settings: Settings, admin: models.User, target: models.User) -> InviteOut:
    raw = issue_token(db, target, "invite", INVITE_TTL)
    db.commit()
    url = f"{settings.app_url.rstrip('/')}/accept-invite?token={raw}"
    org = db.get(models.Organization, admin.organization_id)
    sent = email.send_invite(settings, target.email, target.name, admin.name, org.name, ROLE_LABELS[target.role], url)
    db.refresh(target)
    return InviteOut(user=_user_out(target, {str(target.id)}), email_sent=sent, invite_url=None if sent else url)


@users_router.get("", response_model=list[UserOut])
def list_users(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(models.User).filter(models.User.organization_id == user.organization_id)
            .order_by(models.User.created_at).all())
    pending = _pending_invites(db, [str(u.id) for u in rows])
    return [_user_out(u, pending) for u in rows]


@users_router.post("/invite", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
def invite_user(payload: InviteIn, admin: models.User = Depends(require("users.manage")),
                db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Adds a team member and emails them a link to set their password."""
    role = _parse_role(payload.role)
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    target = models.User(organization_id=admin.organization_id, name=payload.name.strip(), email=payload.email,
                         role=role, password_hash=None, is_active=True)
    db.add(target)
    db.flush()
    return _send_invite(db, settings, admin, target)


def _team_member(db: Session, admin: models.User, user_id: str) -> models.User:
    try:
        target = db.get(models.User, user_id)
    except Exception:
        target = None
    if target is None or str(target.organization_id) != str(admin.organization_id):
        raise HTTPException(status_code=404, detail="User not found")
    return target


@users_router.post("/{user_id}/resend-invite", response_model=InviteOut)
def resend_invite(user_id: str, admin: models.User = Depends(require("users.manage")),
                  db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    target = _team_member(db, admin, user_id)
    if target.password_hash is not None:
        raise HTTPException(status_code=422, detail="This person has already set a password")
    return _send_invite(db, settings, admin, target)


@users_router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, admin: models.User = Depends(require("users.manage")),
                db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Adds a record-only team member (e.g. a field agent with no login).
    For people who need to sign in, use /users/invite."""
    role = _parse_role(payload.role)
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if payload.password:
        _check_password_strength(payload.password, settings, payload.email)
    user = models.User(organization_id=admin.organization_id, name=payload.name.strip(), email=payload.email,
                       role=role, password_hash=hash_password(payload.password) if payload.password else None,
                       is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, admin: models.User = Depends(require("users.manage")),
                db: Session = Depends(get_db)):
    target = _team_member(db, admin, user_id)
    is_self = str(target.id) == str(admin.id)
    if payload.role is not None:
        role = _parse_role(payload.role)
        if is_self and role != models.UserRole.ADMIN:
            raise HTTPException(status_code=422, detail="You can't remove your own admin role")
        target.role = role
        target.session_version = (target.session_version or 0) + 1  # new permissions apply now
    if payload.is_active is not None:
        if is_self and not payload.is_active:
            raise HTTPException(status_code=422, detail="You can't deactivate yourself")
        target.is_active = payload.is_active
        if not payload.is_active:
            target.session_version = (target.session_version or 0) + 1
    db.commit()
    db.refresh(target)
    return _user_out(target, _pending_invites(db, [str(target.id)]))


@users_router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, admin: models.User = Depends(require("users.manage")), db: Session = Depends(get_db)):
    return update_user(user_id, UserUpdate(is_active=False), admin, db)
