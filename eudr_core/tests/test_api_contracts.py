"""API contract tests against a mocked DB session — no Postgres needed.
Auth is satisfied by overriding get_current_user with a fixed org-1 admin;
tests/test_real_database_integration.py covers the real auth flow."""
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.database import get_db
from app.main import app
from app.models import core as models

ORG = "org-1"


def _user():
    return models.User(id="user-1", organization_id=ORG, name="Admin", email="a@x.ng", role=models.UserRole.ADMIN, is_active=True)


@pytest.fixture
def mock_db():
    db = MagicMock()

    def _refresh(obj):
        if getattr(obj, "id", None) is None:
            obj.id = "generated-id"
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(timezone.utc)

    db.refresh.side_effect = _refresh
    return db


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = _user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health():
    with TestClient(app) as c:
        assert c.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("path", ["/api/v1/farmers", "/api/v1/shipments", "/api/v1/dashboard/summary"])
def test_endpoints_require_sign_in(anon_client, path):
    assert anon_client.get(path).status_code == 401


def test_create_farmer_uses_signed_in_users_org(client, mock_db):
    response = client.post(
        "/api/v1/farmers",
        json={"organization_id": "someone-elses-org", "full_name": "Adaeze Nwosu", "phone_number": "+2348012345678"},
    )
    assert response.status_code == 201
    added = mock_db.add.call_args[0][0]
    assert added.organization_id == ORG  # payload org is ignored


def test_get_farmer_not_found(client, mock_db):
    mock_db.get.return_value = None
    assert client.get("/api/v1/farmers/nonexistent").status_code == 404


def test_get_farmer_from_other_org_is_404(client, mock_db):
    mock_db.get.return_value = models.Farmer(id="f-9", organization_id="org-2", full_name="X")
    assert client.get("/api/v1/farmers/f-9").status_code == 404


def test_create_farm_without_polygon(client, mock_db):
    response = client.post("/api/v1/farms", json={"name": "Plot A"})
    assert response.status_code == 201
    mock_db.add.assert_called_once()
    assert response.json()["has_geolocation"] is False


def test_create_farm_with_polygon_computes_area(client, mock_db):
    ring = [[3.3700, 6.5200], [3.3710, 6.5200], [3.3710, 6.5210], [3.3700, 6.5210]]
    response = client.post("/api/v1/farms", json={"polygon_ring": ring})
    assert response.status_code == 201
    added_farm = mock_db.add.call_args[0][0]
    assert added_farm.area_hectares is not None and added_farm.area_hectares > 0


def test_create_farm_rejects_short_polygon(client, mock_db):
    response = client.post("/api/v1/farms", json={"polygon_ring": [[3.37, 6.52], [3.38, 6.53]]})
    assert response.status_code == 422


def test_create_farm_rejects_swapped_or_invalid_coordinates(client, mock_db):
    response = client.post("/api/v1/farms", json={"polygon_ring": [[3.37, 96.52], [3.38, 6.53], [3.39, 6.54]]})
    assert response.status_code == 422


def test_create_harvest_requires_existing_farm(client, mock_db):
    mock_db.get.return_value = None
    response = client.post("/api/v1/harvests", json={"farm_id": "nonexistent", "quantity_kg": 100})
    assert response.status_code == 404


def test_create_harvest_rejects_non_positive_quantity(client, mock_db):
    mock_db.get.return_value = models.Farm(id="farm-1", organization_id=ORG)
    response = client.post("/api/v1/harvests", json={"farm_id": "farm-1", "quantity_kg": 0})
    assert response.status_code == 422


def test_create_collection_event(client, mock_db):
    mock_db.get.return_value = models.Farm(id="farm-1", organization_id=ORG)
    response = client.post(
        "/api/v1/collection-events",
        json={"farm_id": "farm-1", "weight_kg": 50, "location_recorded": True},
    )
    assert response.status_code == 201


def test_create_batch_with_missing_collection_event_404s(client, mock_db):
    mock_db.get.return_value = None
    response = client.post(
        "/api/v1/batches",
        json={"output_kg": 100, "inputs": [{"collection_event_id": "nope", "quantity_kg": 100}]},
    )
    assert response.status_code == 404


def test_create_shipment_with_missing_batch_404s(client, mock_db):
    mock_db.get.return_value = None
    response = client.post("/api/v1/shipments", json={"batch_ids": ["nope"]})
    assert response.status_code == 404


def test_create_document_runs_mock_ocr(client, mock_db):
    mock_db.get.return_value = models.Shipment(id="shipment-1", organization_id=ORG)
    response = client.post(
        "/api/v1/documents",
        json={
            "document_type": "export_certificate",
            "linked_to_type": "shipment",
            "linked_to_id": "shipment-1",
            "object_key": "docs/org-1/cert.pdf",
        },
    )
    assert response.status_code == 201
    added = mock_db.add.call_args[0][0]
    assert added.extracted_fields is not None


def test_create_document_rejects_invalid_document_type(client, mock_db):
    response = client.post(
        "/api/v1/documents",
        json={
            "document_type": "not_a_real_type",
            "linked_to_type": "shipment",
            "linked_to_id": "shipment-1",
            "object_key": "docs/org-1/x.pdf",
        },
    )
    assert response.status_code == 422


def test_assess_shipment_not_found(client, mock_db):
    mock_db.get.return_value = None
    assert client.post("/api/v1/shipments/nonexistent/assess").status_code == 404


def test_get_readiness_with_no_prior_assessment_404s(client, mock_db):
    mock_db.get.return_value = models.Shipment(id="shipment-1", organization_id=ORG)
    mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
    assert client.get("/api/v1/shipments/shipment-1/readiness").status_code == 404
