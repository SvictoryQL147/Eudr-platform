"""
Phase 1 hardening, end to end against the real Postgres database:
cookie sessions + CSRF, login lockout, password reset, change password,
invitations, role permissions, the append-only audit log, S3 storage
(mocked with moto) and security headers. Skipped without a database,
like test_real_database_integration.py.
"""
import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.main import app
from app.services import email as email_service


def _db_ok():
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_ok(), reason="No reachable Postgres+PostGIS")

PW = "correct-horse-battery-1"
CSRF = {"X-Requested-With": "ala"}


def _email():
    return f"{uuid.uuid4().hex[:10]}@test.ng"


def _new_client():
    return TestClient(app)


def _register(c, email=None):
    email = email or _email()
    r = c.post("/api/v1/auth/register", json={"organization_name": "Phase1 Org", "name": "Ada Admin", "email": email, "password": PW})
    assert r.status_code == 201, r.text
    return email, r.json()


def _invite(admin, role):
    email = _email()
    r = admin.post("/api/v1/users/invite", json={"name": f"New {role}", "email": email, "role": role}, headers=CSRF)
    assert r.status_code == 201, r.text
    token = re.search(r"token=([\w-]+)", r.json()["invite_url"]).group(1)
    member = _new_client()
    r = member.post("/api/v1/auth/accept-invite", json={"token": token, "password": PW})
    assert r.status_code == 200, r.text
    return member, email


# --- Sessions --------------------------------------------------------------


def test_login_sets_httponly_cookie_and_me_works_without_bearer():
    c = _new_client()
    email, _ = _register(c)
    c.cookies.clear()
    r = c.post("/api/v1/auth/login", json={"email": email, "password": PW})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"]
    assert "ala_session=" in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie
    me = c.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == email
    assert "users.manage" in me.json()["permissions"]


def test_cookie_writes_need_csrf_header():
    c = _new_client()
    _register(c)
    body = {"full_name": "Csrf Farmer"}
    assert c.post("/api/v1/farmers", json=body).status_code == 403
    assert c.post("/api/v1/farmers", json=body, headers=CSRF).status_code == 201


def test_logout_clears_cookie():
    c = _new_client()
    _register(c)
    assert c.post("/api/v1/auth/logout").status_code == 204
    assert c.get("/api/v1/auth/me").status_code == 401


def test_login_lockout_after_repeated_failures():
    c = _new_client()
    email, _ = _register(c)
    c.cookies.clear()
    s = get_settings()
    for _ in range(s.login_max_failures):
        assert c.post("/api/v1/auth/login", json={"email": email, "password": "nope-nope-nope"}).status_code == 401
    r = c.post("/api/v1/auth/login", json={"email": email, "password": PW})
    assert r.status_code == 429 and "locked" in r.json()["detail"]
    assert "Retry-After" in r.headers


def test_wrong_email_and_wrong_password_look_the_same():
    c = _new_client()
    email, _ = _register(c)
    a = c.post("/api/v1/auth/login", json={"email": "nobody-" + email, "password": PW})
    b = c.post("/api/v1/auth/login", json={"email": email, "password": "wrong-wrong-wrong"})
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


def test_weak_password_rejected_on_register():
    c = _new_client()
    r = c.post("/api/v1/auth/register", json={"organization_name": "X Org", "name": "X Y", "email": _email(), "password": "short"})
    assert r.status_code == 422


# --- Passwords ----------------------------------------------------------------


def test_forgot_and_reset_password_flow_ends_old_sessions():
    c = _new_client()
    email, data = _register(c)
    old_token = data["access_token"]
    email_service.OUTBOX.clear()
    r = c.post("/api/v1/auth/forgot-password", json={"email": email})
    assert r.status_code == 202
    msg = email_service.OUTBOX[-1]
    assert msg["to"] == email and "Reset" in msg["subject"]
    token = re.search(r"token=([\w-]+)", msg["text"]).group(1)

    r = c.post("/api/v1/auth/reset-password", json={"token": token, "password": "brand-new-password-9"})
    assert r.status_code == 200, r.text
    # link is single use
    assert c.post("/api/v1/auth/reset-password", json={"token": token, "password": "another-password-9"}).status_code == 400
    # old session is dead
    assert _new_client().get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401
    assert c.post("/api/v1/auth/login", json={"email": email, "password": "brand-new-password-9"}).status_code == 200


def test_forgot_password_same_answer_for_unknown_email():
    c = _new_client()
    email_service.OUTBOX.clear()
    r = c.post("/api/v1/auth/forgot-password", json={"email": "ghost-" + _email()})
    assert r.status_code == 202 and email_service.OUTBOX == []


def test_change_password_keeps_this_session_and_ends_others():
    c = _new_client()
    email, data = _register(c)
    other = data["access_token"]
    r = c.post("/api/v1/auth/change-password", json={"current_password": "wrong-wrong-wrong", "new_password": "x" * 12}, headers=CSRF)
    assert r.status_code == 400
    r = c.post("/api/v1/auth/change-password", json={"current_password": PW, "new_password": "fresh-password-77"}, headers=CSRF)
    assert r.status_code == 200, r.text
    assert c.get("/api/v1/auth/me").status_code == 200
    assert _new_client().get("/api/v1/auth/me", headers={"Authorization": f"Bearer {other}"}).status_code == 401


# --- Invitations and permissions ---------------------------------------------


def test_invite_flow_and_invite_info():
    admin = _new_client()
    _register(admin)
    email = _email()
    r = admin.post("/api/v1/users/invite", json={"name": "Bola Staff", "email": email, "role": "exporter_staff"}, headers=CSRF)
    assert r.status_code == 201
    out = r.json()
    assert out["email_sent"] is False and out["invite_url"]  # console email backend
    assert out["user"]["invite_pending"] is True and out["user"]["has_login"] is False
    token = re.search(r"token=([\w-]+)", out["invite_url"]).group(1)
    info = _new_client().get(f"/api/v1/auth/invite/{token}").json()
    assert info["email"] == email and info["organization_name"] == "Phase1 Org"
    member = _new_client()
    assert member.post("/api/v1/auth/accept-invite", json={"token": token, "password": PW}).status_code == 200
    assert member.get("/api/v1/auth/me").json()["user"]["role"] == "exporter_staff"
    # token is used up
    assert _new_client().get(f"/api/v1/auth/invite/{token}").status_code == 404


def test_role_permissions_are_enforced():
    admin = _new_client()
    _register(admin)
    agent, _ = _invite(admin, "field_agent")
    reviewer, _ = _invite(admin, "compliance_reviewer")

    # field agent: can add farmers, can't create shipments or invite people
    assert agent.post("/api/v1/farmers", json={"full_name": "Agent Farmer"}, headers=CSRF).status_code == 201
    assert agent.post("/api/v1/shipments", json={"batch_ids": []}, headers=CSRF).status_code == 403
    assert agent.post("/api/v1/users/invite", json={"name": "Zz Zz", "email": _email()}, headers=CSRF).status_code == 403
    # reviewer: reads everything, can't add farmers
    assert reviewer.get("/api/v1/farmers").status_code == 200
    assert reviewer.post("/api/v1/farmers", json={"full_name": "Nope"}, headers=CSRF).status_code == 403


def test_role_change_takes_effect_immediately():
    admin = _new_client()
    _register(admin)
    staff, email = _invite(admin, "exporter_staff")
    uid = staff.get("/api/v1/auth/me").json()["user"]["id"]
    assert admin.patch(f"/api/v1/users/{uid}", json={"role": "compliance_reviewer"}, headers=CSRF).status_code == 200
    assert staff.get("/api/v1/auth/me").status_code == 401  # must sign in again with the new role


def test_admin_cannot_demote_or_deactivate_self():
    admin = _new_client()
    _, data = _register(admin)
    uid = data["user"]["id"]
    assert admin.patch(f"/api/v1/users/{uid}", json={"role": "field_agent"}, headers=CSRF).status_code == 422
    assert admin.patch(f"/api/v1/users/{uid}", json={"is_active": False}, headers=CSRF).status_code == 422


# --- Audit log ------------------------------------------------------------------


def test_changes_are_audited_and_log_is_append_only():
    c = _new_client()
    _register(c)
    farmer = c.post("/api/v1/farmers", json={"full_name": "Audit Farmer", "state": "Ondo"}, headers=CSRF).json()
    c.patch(f"/api/v1/farmers/{farmer['id']}", json={"state": "Osun"}, headers=CSRF)
    history = c.get("/api/v1/audit", params={"entity_id": farmer["id"]}).json()
    actions = [e["action"] for e in history]
    assert "farmer.create" in actions and "farmer.update" in actions
    upd = next(e for e in history if e["action"] == "farmer.update")
    assert upd["changes"]["state"] == {"from": "Ondo", "to": "Osun"} and upd["user_name"] == "Ada Admin"

    feed = c.get("/api/v1/audit").json()
    assert any(e["action"] == "organization.create" for e in feed)

    with engine.begin() as conn, pytest.raises(Exception, match="append-only"):
        conn.execute(text("UPDATE audit_events SET summary='tampered' WHERE entity_id=:i"), {"i": farmer["id"]})


def test_other_orgs_audit_is_invisible():
    a, b = _new_client(), _new_client()
    _register(a)
    _register(b)
    farmer = a.post("/api/v1/farmers", json={"full_name": "Private Farmer"}, headers=CSRF).json()
    assert b.get("/api/v1/audit", params={"entity_id": farmer["id"]}).json() == []


# --- Storage, headers, health -----------------------------------------------------


def test_documents_go_to_s3_and_download_back(monkeypatch):
    moto = pytest.importorskip("moto")
    import boto3

    with moto.mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="ala-docs")
        s = get_settings()
        for k, v in dict(storage_backend="s3", s3_bucket="ala-docs", s3_region="us-east-1", s3_endpoint_url=None,
                         s3_access_key_id="test", s3_secret_access_key="test").items():
            monkeypatch.setattr(s, k, v)
        from app.services import storage
        storage._s3.cache_clear()

        c = _new_client()
        _register(c)
        farmer = c.post("/api/v1/farmers", json={"full_name": "Doc Farmer"}, headers=CSRF).json()
        r = c.post("/api/v1/documents/upload", headers=CSRF,
                   data={"document_type": "farmer_id", "linked_to_type": "farmer", "linked_to_id": farmer["id"]},
                   files={"file": ("id.pdf", b"%PDF-1.4 national id", "application/pdf")})
        assert r.status_code == 201, r.text
        doc = r.json()
        assert doc["has_file"]
        assert c.get(f"/api/v1/documents/{doc['id']}/file").content == b"%PDF-1.4 national id"
        link = c.get(f"/api/v1/documents/{doc['id']}/link").json()
        assert link["url"].startswith("https://") and "Signature" in link["url"]
        # spoofed file type is refused
        bad = c.post("/api/v1/documents/upload", headers=CSRF,
                     data={"document_type": "farmer_id", "linked_to_type": "farmer", "linked_to_id": farmer["id"]},
                     files={"file": ("evil.pdf", b"MZ\x90\x00 not a pdf", "application/pdf")})
        assert bad.status_code == 415
        storage._s3.cache_clear()


def test_security_headers_and_readiness():
    c = _new_client()
    r = c.get("/health/ready")
    assert r.status_code == 200 and r.json()["database"] == "ok"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert c.get("/api/v1/auth/me").headers["cache-control"] == "no-store"
