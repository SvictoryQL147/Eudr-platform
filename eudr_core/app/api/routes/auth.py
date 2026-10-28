from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models
from app.schemas.core import (
    LoginIn,
    MeOut,
    OrganizationOut,
    RegisterIn,
    TokenOut,
    UserCreate,
    UserOut,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
users_router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _token_response(user: models.User, db: Session, settings: Settings) -> TokenOut:
    org = db.get(models.Organization, user.organization_id)
    return TokenOut(
        access_token=create_access_token(user, settings),
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Creates a new organization (an exporter, aggregator or cooperative)
    and its first admin user, and signs them in."""
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

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
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user, db, settings)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    user = db.query(models.User).filter(models.User.email == payload.email.strip().lower()).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return _token_response(user, db, settings)


@router.get("/me", response_model=MeOut)
def me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(models.Organization, user.organization_id)
    return MeOut(user=UserOut.model_validate(user), organization=OrganizationOut.model_validate(org))


@users_router.get("", response_model=list[UserOut])
def list_users(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(models.User)
        .filter(models.User.organization_id == user.organization_id)
        .order_by(models.User.created_at)
        .all()
    )


@users_router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    admin: models.User = Depends(require_roles(models.UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    try:
        role = models.UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Unknown role {payload.role}")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = models.User(
        organization_id=admin.organization_id,
        name=payload.name.strip(),
        email=payload.email,
        role=role,
        password_hash=hash_password(payload.password) if payload.password else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@users_router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: str,
    admin: models.User = Depends(require_roles(models.UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    target = db.get(models.User, user_id)
    if target is None or str(target.organization_id) != str(admin.organization_id):
        raise HTTPException(status_code=404, detail="User not found")
    if str(target.id) == str(admin.id):
        raise HTTPException(status_code=422, detail="You can't deactivate yourself")
    target.is_active = False
    db.commit()
    db.refresh(target)
    return target
