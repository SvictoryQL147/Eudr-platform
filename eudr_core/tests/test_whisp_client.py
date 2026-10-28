"""WhispProvider against a fake HTTP transport — checks the request we send
(header, body shape) and both the synchronous and queued+polling paths."""
import json

import httpx
import pytest

from app.config import Settings
from app.services import deforestation as d

PLOT = d.PlotToScreen("farm-1", [[5.11, 7.11], [5.112, 7.11], [5.112, 7.112], [5.11, 7.11]], "x" * 64)
RESULT_FC = {
    "type": "FeatureCollection",
    "features": [{"type": "Feature", "geometry": None, "properties": {"external_id": "farm-1", "risk_pcrop": "low", "Ind_01_treecover": "no"}}],
}


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(d.time, "sleep", lambda s: None)


def _provider(handler):
    settings = Settings(whisp_api_key="k-123", whisp_base_url="https://whisp.test", whisp_timeout_seconds=60)
    return d.WhispProvider(settings, client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_sync_result():
    seen = {}

    def handler(request: httpx.Request):
        seen["key"] = request.headers.get("x-api-key")
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"code": "analysis_completed", "message": "ok", "data": RESULT_FC})

    [r] = _provider(handler).screen([PLOT], "cocoa")
    assert seen["key"] == "k-123"
    assert seen["body"]["type"] == "FeatureCollection"
    assert seen["body"]["analysisOptions"]["externalIdColumn"] == "external_id"
    assert seen["body"]["features"][0]["properties"]["external_id"] == "farm-1"
    assert r.farm_id == "farm-1" and r.risk == "low"


def test_queued_then_polled():
    calls = {"status": 0}

    def handler(request: httpx.Request):
        if request.method == "POST":
            return httpx.Response(202, json={"code": "analysis_queued", "message": "q", "data": {"token": "t1"}})
        calls["status"] += 1
        if calls["status"] < 2:
            return httpx.Response(202, json={"code": "analysis_processing", "message": "p", "data": {"percent": 40}})
        return httpx.Response(200, json={"code": "analysis_completed", "message": "ok", "data": RESULT_FC})

    [r] = _provider(handler).screen([PLOT], "cocoa")
    assert r.risk == "low" and calls["status"] == 2


def test_bad_key_raises_clear_error():
    provider = _provider(lambda req: httpx.Response(401, json={"code": "auth_missing_api_key", "message": "no"}))
    with pytest.raises(d.ScreeningError, match="API key"):
        provider.screen([PLOT], "cocoa")


def test_missing_key_is_unavailable():
    with pytest.raises(d.ScreeningUnavailable):
        d.WhispProvider(Settings(whisp_api_key=None))
