"""
Brute-force protection, stored in Postgres so limits hold across every
serverless instance (an in-memory counter would reset on each cold start).
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import core as models


def record_attempt(db: Session, email: str, ip: str | None, kind: str, success: bool) -> None:
    db.add(models.LoginAttempt(email=email[:255], ip=ip, kind=kind, success=success))


def _failures_since_last_success(db: Session, email: str, since: datetime) -> list[datetime]:
    last_ok = (db.query(func.max(models.LoginAttempt.created_at))
               .filter(models.LoginAttempt.email == email, models.LoginAttempt.kind == "login",
                       models.LoginAttempt.success.is_(True), models.LoginAttempt.created_at >= since).scalar())
    q = db.query(models.LoginAttempt.created_at).filter(
        models.LoginAttempt.email == email, models.LoginAttempt.kind == "login",
        models.LoginAttempt.success.is_(False), models.LoginAttempt.created_at >= (last_ok or since))
    return [row[0] for row in q.order_by(models.LoginAttempt.created_at).all()]


def check_login_allowed(db: Session, settings: Settings, email: str, ip: str | None) -> None:
    now = datetime.now(timezone.utc)
    window = timedelta(minutes=settings.login_window_minutes)
    since = now - window
    failures = _failures_since_last_success(db, email, since)
    if len(failures) >= settings.login_max_failures:
        unlock = failures[-settings.login_max_failures] + window
        minutes = max(1, int((unlock - now).total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=429,
            detail=f"Too many wrong passwords. This account is locked for {minutes} more minute{'s' if minutes != 1 else ''}, "
                   "or reset your password.",
            headers={"Retry-After": str(minutes * 60)},
        )
    if ip:
        ip_failures = (db.query(func.count(models.LoginAttempt.id))
                       .filter(models.LoginAttempt.ip == ip, models.LoginAttempt.success.is_(False),
                               models.LoginAttempt.created_at >= since).scalar())
        if ip_failures >= settings.ip_max_failures:
            raise HTTPException(status_code=429, detail="Too many sign-in attempts from your network. Try again later.",
                                headers={"Retry-After": str(settings.login_window_minutes * 60)})


def check_reset_allowed(db: Session, settings: Settings, email: str, ip: str | None) -> bool:
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    n = (db.query(func.count(models.LoginAttempt.id))
         .filter(models.LoginAttempt.email == email, models.LoginAttempt.kind == "reset",
                 models.LoginAttempt.created_at >= since).scalar())
    if n >= settings.password_reset_max_per_hour:
        return False
    if ip:
        n_ip = (db.query(func.count(models.LoginAttempt.id))
                .filter(models.LoginAttempt.ip == ip, models.LoginAttempt.kind == "reset",
                        models.LoginAttempt.created_at >= since).scalar())
        if n_ip >= settings.password_reset_max_per_hour * 10:
            return False
    return True
