"""
Who can do what. One table, enforced on the server for every write.

Reading is open to every signed-in member of the organization. Writing is
split by job: field agents capture farm data, staff run the supply chain,
compliance reviewers run checks, admins manage the team. The dashboard
hides buttons a role can't use, but this file is what actually decides.
"""
from fastapi import Depends, HTTPException, Request

from app.models.core import User, UserRole

A, R, S, F = (UserRole.ADMIN, UserRole.COMPLIANCE_REVIEWER, UserRole.EXPORTER_STAFF, UserRole.FIELD_AGENT)

PERMISSIONS: dict[str, set[UserRole]] = {
    # Farmers, farms, harvests, collections
    "records.write": {A, S, F},
    # Batches and shipments
    "supply_chain.write": {A, S},
    # Upload or register documents
    "documents.write": {A, S, R, F},
    # Run readiness checks and deforestation screening
    "compliance.run": {A, S, R},
    # Team management
    "users.manage": {A},
    # Full activity history for the organization
    "audit.view": {A, R},
}

ROLE_LABELS = {
    A: "Admin",
    R: "Compliance reviewer",
    S: "Exporter staff",
    F: "Field agent",
}


def permissions_for(role: UserRole) -> list[str]:
    return sorted(p for p, roles in PERMISSIONS.items() if role in roles)


def has_permission(user: User, permission: str) -> bool:
    return user.role in PERMISSIONS[permission]


def _deny(permission: str):
    raise HTTPException(status_code=403, detail="Your role doesn't allow this. Ask an admin on your team.")


def require(permission: str):
    """Dependency: the signed-in user must hold `permission`."""
    from app.auth import get_current_user

    if permission not in PERMISSIONS:
        raise ValueError(f"Unknown permission {permission}")

    def _check(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user, permission):
            _deny(permission)
        return user

    return _check


def writes_require(permission: str):
    """Router-level dependency: reads are open to members, any write
    (POST/PUT/PATCH/DELETE) needs `permission`."""
    from app.auth import get_current_user

    def _check(request: Request, user: User = Depends(get_current_user)) -> None:
        if request.method not in ("GET", "HEAD", "OPTIONS") and not has_permission(user, permission):
            _deny(permission)

    return Depends(_check)
