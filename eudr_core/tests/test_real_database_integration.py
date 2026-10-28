"""
Every other test file in this repo deliberately avoids a real database
(see README "Architecture"). This file is the one deliberate exception:
it exercises the actual Postgres+PostGIS codepath end to end, because
that's the only way to catch bugs in the ORM/DB boundary itself — enum
value mismatches, geometry column round-tripping, foreign key
constraints. It found exactly one real bug during development: SQLAlchemy
was sending Python enum *names* ("EXPORT_CERTIFICATE") instead of the
lowercase *values* ("export_certificate") the DDL expects, silently
breaking every document upload. Fixed in app/models/core.py by adding
values_callable to every Enum column.

Skipped automatically if EUDR_DATABASE_URL isn't reachable — this is not
meant to run in CI without a real Postgres+PostGIS instance available.
Run explicitly with: pytest tests/test_real_database_integration.py -v
"""
import uuid

import pytest
from sqlalchemy import text

from app.database import SessionLocal, engine


def _database_available() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _database_available(),
    reason="No reachable Postgres+PostGIS at EUDR_DATABASE_URL — see README for setup",
)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def anon(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from app.config import get_settings
    from app.main import app

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    return TestClient(app)


def _register(anon, org_name="Integration Test Org"):
    email = f"{uuid.uuid4().hex[:10]}@test.ng"
    r = anon.post(
        "/api/v1/auth/register",
        json={"organization_name": org_name, "name": "Test Admin", "email": email, "password": "correct-horse-1"},
    )
    assert r.status_code == 201, r.text
    return r.json(), email


@pytest.fixture
def session(anon):
    data, email = _register(anon)
    anon.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    return anon, data


@pytest.fixture
def client(session):
    return session[0]


@pytest.fixture
def agent_id(client):
    r = client.post("/api/v1/users", json={"name": "Field Agent", "email": f"{uuid.uuid4().hex[:8]}@agent.ng", "role": "field_agent"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.fixture
def fake_screening(monkeypatch):
    """Switches screening on with a fake provider whose risk we control."""
    from app.config import get_settings
    from app.services import deforestation as d

    state = {"risk": "low"}

    class FakeProvider:
        name = "whisp"

        def screen(self, plots, commodity):
            return [d.ScreeningResult(p.farm_id, state["risk"], {"treecover_2020": "no"}, {}) for p in plots]

    monkeypatch.setattr(get_settings(), "screening_provider", "whisp")
    monkeypatch.setattr(d, "get_provider", lambda settings: FakeProvider())
    return state


def _screen(client, shipment_id):
    r = client.post("/api/v1/screening/jobs", json={"shipment_id": shipment_id})
    assert r.status_code == 202, r.text
    job = client.get(f"/api/v1/screening/jobs/{r.json()['id']}").json()
    assert job["status"] == "done", job
    return job


def _clean_chain(client, agent_id, weight=480):
    farmer_id = client.post(
        "/api/v1/farmers",
        json={
            "full_name": "Test Farmer",
            "phone_number": "+2348011111111",
            "national_id_number": "NIN000111222",
            "community": "Idanre",
            "state": "Ondo",
        },
    ).json()["id"]
    ring = [[5.1100, 7.1100], [5.1120, 7.1100], [5.1120, 7.1120], [5.1100, 7.1120]]
    farm_id = client.post("/api/v1/farms", json={"farmer_id": farmer_id, "name": "Plot A", "polygon_ring": ring}).json()["id"]
    client.post("/api/v1/harvests", json={"farm_id": farm_id, "harvest_date": "2026-06-01", "quantity_kg": 500})
    collection_id = client.post(
        "/api/v1/collection-events",
        json={"farm_id": farm_id, "agent_user_id": agent_id, "weight_kg": weight, "location_recorded": True},
    ).json()["id"]
    batch_id = client.post(
        "/api/v1/batches",
        json={"output_kg": weight, "inputs": [{"collection_event_id": collection_id, "quantity_kg": weight}]},
    ).json()["id"]
    shipment_id = client.post(
        "/api/v1/shipments",
        json={"destination_country": "Netherlands", "buyer_name": "ACME BV", "reference": "SHP-TEST", "batch_ids": [batch_id]},
    ).json()["id"]
    return dict(farmer_id=farmer_id, farm_id=farm_id, collection_id=collection_id, batch_id=batch_id, shipment_id=shipment_id)


def test_login_works_and_wrong_password_is_rejected(anon):
    _, email = _register(anon)
    assert anon.post("/api/v1/auth/login", json={"email": email, "password": "correct-horse-1"}).status_code == 200
    assert anon.post("/api/v1/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401
    assert anon.post(
        "/api/v1/auth/register",
        json={"organization_name": "Dup", "name": "Dup", "email": email, "password": "correct-horse-1"},
    ).status_code == 409


def test_document_upload_enum_round_trips_correctly(client, agent_id):
    """Regression test for the enum names-vs-values bug in this file's docstring."""
    ids = _clean_chain(client, agent_id)
    response = client.post(
        "/api/v1/documents",
        json={
            "document_type": "export_certificate",
            "linked_to_type": "shipment",
            "linked_to_id": ids["shipment_id"],
            "object_key": "docs/test/cert.pdf",
        },
    )
    assert response.status_code == 201
    assert response.json()["document_type"] == "export_certificate"


def test_full_clean_shipment_pipeline_scores_100(client, agent_id, fake_screening):
    ids = _clean_chain(client, agent_id)
    _screen(client, ids["shipment_id"])
    up = client.post(
        "/api/v1/documents/upload",
        data={"document_type": "export_certificate", "linked_to_type": "shipment", "linked_to_id": ids["shipment_id"]},
        files={"file": ("cert.pdf", b"%PDF-1.4 test certificate", "application/pdf")},
    )
    assert up.status_code == 201, up.text
    assert up.json()["has_file"] is True
    file_resp = client.get(f"/api/v1/documents/{up.json()['id']}/file")
    assert file_resp.status_code == 200 and file_resp.content.startswith(b"%PDF")

    result = client.post(f"/api/v1/shipments/{ids['shipment_id']}/assess").json()
    assert result["score"] == 100
    assert result["is_blocked"] is False
    assert result["findings"] == []

    listed = client.get("/api/v1/shipments").json()
    assert listed[0]["latest_score"] == 100 and listed[0]["net_mass_kg"] == 480


def test_unmapped_farm_blocks_the_shipment(client, agent_id):
    farmer_id = client.post("/api/v1/farmers", json={"full_name": "Unverified Farmer"}).json()["id"]
    farm_id = client.post("/api/v1/farms", json={"farmer_id": farmer_id}).json()["id"]  # no polygon
    client.post("/api/v1/harvests", json={"farm_id": farm_id, "quantity_kg": 200})
    collection_id = client.post(
        "/api/v1/collection-events",
        json={"farm_id": farm_id, "agent_user_id": agent_id, "weight_kg": 190, "location_recorded": True},
    ).json()["id"]
    batch_id = client.post(
        "/api/v1/batches", json={"output_kg": 190, "inputs": [{"collection_event_id": collection_id, "quantity_kg": 190}]}
    ).json()["id"]
    shipment_id = client.post("/api/v1/shipments", json={"batch_ids": [batch_id]}).json()["id"]
    client.post(
        "/api/v1/documents",
        json={
            "document_type": "export_certificate",
            "linked_to_type": "shipment",
            "linked_to_id": shipment_id,
            "object_key": "docs/test/cert.pdf",
        },
    )
    result = client.post(f"/api/v1/shipments/{shipment_id}/assess").json()
    assert result["is_blocked"] is True
    rule_ids = {f["rule_id"] for f in result["findings"]}
    assert "farm.missing_geolocation" in rule_ids

    pack = client.get(f"/api/v1/shipments/{shipment_id}/evidence-pack").json()
    assert pack["geolocation"]["features"] == []
    assert len(pack["unmapped_plots"]) == 1


def test_other_organization_cannot_see_or_touch_your_data(anon, client, agent_id):
    ids = _clean_chain(client, agent_id)
    other, _ = _register(anon, "Competitor Ltd")
    from fastapi.testclient import TestClient

    from app.main import app

    intruder = TestClient(app)
    intruder.headers.update({"Authorization": f"Bearer {other['access_token']}"})
    assert intruder.get(f"/api/v1/farmers/{ids['farmer_id']}").status_code == 404
    assert intruder.get(f"/api/v1/shipments/{ids['shipment_id']}/evidence-pack").status_code == 404
    assert intruder.post(f"/api/v1/shipments/{ids['shipment_id']}/assess").status_code == 404
    assert intruder.post("/api/v1/harvests", json={"farm_id": ids["farm_id"], "quantity_kg": 10}).status_code == 404
    assert intruder.get("/api/v1/farmers").json() == []


def test_same_kilos_cannot_be_batched_twice_and_batch_ships_once(client, agent_id):
    ids = _clean_chain(client, agent_id)  # collection fully batched (480 of 480)
    r = client.post(
        "/api/v1/batches",
        json={"output_kg": 10, "inputs": [{"collection_event_id": ids["collection_id"], "quantity_kg": 10}]},
    )
    assert r.status_code == 422
    r = client.post("/api/v1/shipments", json={"batch_ids": [ids["batch_id"]]})
    assert r.status_code == 422


def test_evidence_pack_and_geojson(client, agent_id):
    """No screening here -> the pack must say so honestly."""
    ids = _clean_chain(client, agent_id)
    client.post(f"/api/v1/shipments/{ids['shipment_id']}/assess")
    pack = client.get(f"/api/v1/shipments/{ids['shipment_id']}/evidence-pack").json()
    assert pack["shipment"]["hs_code"] == "1801"
    assert pack["dds_support"]["net_mass_kg"] == 480
    feature = pack["geolocation"]["features"][0]
    assert feature["properties"]["ProducerCountry"] == "NG"
    assert feature["properties"]["ProductionPlace"] == "Idanre, Ondo"
    ring = feature["geometry"]["coordinates"][0]
    assert ring[0] == ring[-1]
    assert len(pack["content_sha256"]) == 64
    assert pack["deforestation_screening"]["status"] == "not_performed"
    assert "farm.deforestation_risk" in {f["rule_id"] for f in pack["compliance_assessment"]["findings"]}

    geo = client.get(f"/api/v1/shipments/{ids['shipment_id']}/geolocation.geojson")
    assert geo.status_code == 200
    assert "attachment" in geo.headers["content-disposition"]

    summary = client.get("/api/v1/dashboard/summary").json()
    # no export certificate uploaded in this test -> correctly blocked
    assert summary["shipments"] == 1 and summary["shipments_blocked"] == 1
    assert "document.missing_required_shipment_document" in {i["rule_id"] for i in summary["top_issues"]}
    assert summary["deforestation"]["not_screened"] >= 1


def test_high_risk_blocks_and_redrawn_boundary_needs_rescreening(client, agent_id, fake_screening):
    ids = _clean_chain(client, agent_id)
    client.post(
        "/api/v1/documents",
        json={"document_type": "export_certificate", "linked_to_type": "shipment",
              "linked_to_id": ids["shipment_id"], "object_key": "x.pdf"},
    )
    fake_screening["risk"] = "high"
    job = _screen(client, ids["shipment_id"])
    assert job["farm_count"] == 1 and job["done_count"] == 1
    result = client.post(f"/api/v1/shipments/{ids['shipment_id']}/assess").json()
    assert result["is_blocked"] is True
    assert [f["severity"] for f in result["findings"] if f["rule_id"] == "farm.deforestation_risk"] == ["critical"]

    farm = client.get(f"/api/v1/farms/{ids['farm_id']}").json()
    assert farm["deforestation_risk"] == "high"
    pack = client.get(f"/api/v1/shipments/{ids['shipment_id']}/evidence-pack").json()
    assert pack["deforestation_screening"]["status"] == "performed"
    assert pack["geolocation"]["features"][0]["properties"]["DeforestationRisk"] == "high"

    # redraw the boundary -> old result no longer counts
    ring = [[5.1100, 7.1100], [5.1125, 7.1100], [5.1125, 7.1120], [5.1100, 7.1120]]
    farm = client.patch(f"/api/v1/farms/{ids['farm_id']}", json={"polygon_ring": ring}).json()
    assert farm["deforestation_risk"] is None and farm["screening_outdated"] is True
    fake_screening["risk"] = "low"
    _screen(client, ids["shipment_id"])
    result = client.post(f"/api/v1/shipments/{ids['shipment_id']}/assess").json()
    assert result["score"] == 100


def test_screening_switched_off_gives_clear_409(client, agent_id):
    from app.config import get_settings

    if get_settings().screening_provider != "none":
        pytest.skip("screening configured in this environment")
    ids = _clean_chain(client, agent_id)
    r = client.post("/api/v1/screening/jobs", json={"shipment_id": ids["shipment_id"]})
    assert r.status_code == 409 and "EUDR_SCREENING_PROVIDER" in r.json()["detail"]
    assert client.get("/api/v1/screening/status").json()["enabled"] is False
