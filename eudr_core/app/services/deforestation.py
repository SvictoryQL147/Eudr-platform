"""
Deforestation screening: is there evidence a farm was forest on
31 Dec 2020 and has been cleared since? That is the core EUDR question.

The real provider is **Whisp** ("What is in that plot?") from FAO and the
Forest Data Partnership — open source (MIT), built for EUDR. For each plot
it runs a "convergence of evidence" over many public satellite datasets and
answers four questions: tree cover in 2020? commodity/agriculture in 2020?
disturbance before 2020? disturbance after 2020? From those it gives a risk
of "low", "high" or "more_info_needed". For perennial crops (cocoa, coffee,
rubber, oil palm) the relevant result is `risk_pcrop`; for soy `risk_acrop`;
for timber `risk_timber`.

API used (whisp.openforis.org, see its /api/docs):
    POST {base}/api/submit/geojson   header x-api-key, body = GeoJSON
                                     FeatureCollection + "analysisOptions"
      200 analysis_completed -> data is the result FeatureCollection
      202 analysis_queued    -> data.token; poll GET {base}/api/status/{token}
Results are ephemeral on Whisp's side, so we store everything we need.

The "demo" provider exists only so you can show the product without an API
key. Every demo result is stored with provider="demo" and shown as DEMO in
the dashboard and evidence pack — never present demo results as real.
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models import core as models

RISK_LOW = "low"
RISK_HIGH = "high"
RISK_MORE_INFO = "more_info_needed"
VALID_RISKS = {RISK_LOW, RISK_HIGH, RISK_MORE_INFO}

# Which Whisp risk column applies to which commodity.
COMMODITY_RISK_COLUMN = {
    "cocoa": "risk_pcrop",
    "cocoa_products": "risk_pcrop",
    "coffee": "risk_pcrop",
    "rubber": "risk_pcrop",
    "palm_oil": "risk_pcrop",
    "soya": "risk_acrop",
    "wood": "risk_timber",
}

INDICATORS = {
    "ind_01": "treecover_2020",
    "ind_02": "commodities_2020",
    "ind_03": "disturbance_before_2020",
    "ind_04": "disturbance_after_2020",
}


class ScreeningUnavailable(RuntimeError):
    pass


class ScreeningError(RuntimeError):
    pass


@dataclass
class PlotToScreen:
    farm_id: str
    ring: list[list[float]]  # [[lon, lat], ...] closed
    polygon_hash: str


@dataclass
class ScreeningResult:
    farm_id: str
    risk: str
    indicators: dict = field(default_factory=dict)
    details: dict = field(default_factory=dict)


def polygon_hash(farm: models.Farm) -> str | None:
    if farm.polygon is None:
        return None
    shape = to_shape(farm.polygon)
    coords = [[round(x, 7), round(y, 7)] for x, y in shape.exterior.coords]
    return hashlib.sha256(json.dumps(coords).encode()).hexdigest()


def plot_for(farm: models.Farm) -> PlotToScreen | None:
    if farm.polygon is None:
        return None
    shape = to_shape(farm.polygon)
    ring = [[round(x, 7), round(y, 7)] for x, y in shape.exterior.coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return PlotToScreen(farm_id=str(farm.id), ring=ring, polygon_hash=polygon_hash(farm))


def normalize_risk(value) -> str | None:
    if value is None:
        return None
    v = str(value).strip().lower().replace(" ", "_").replace("-", "_")
    if v in VALID_RISKS:
        return v
    if v in {"more_info", "more_information_needed", "moreinfoneeded"}:
        return RISK_MORE_INFO
    return None


def _lower_keys(d: dict) -> dict:
    return {str(k).lower(): v for k, v in (d or {}).items()}


def parse_whisp_feature(props: dict, risk_column: str) -> tuple[str | None, str | None, dict, dict]:
    """Returns (farm_id, risk, indicators, details) from one result feature."""
    p = _lower_keys(props)
    farm_id = p.get("external_id") or p.get("externalid")
    risk = normalize_risk(p.get(risk_column.lower()))
    indicators = {}
    for key, value in p.items():
        for prefix, name in INDICATORS.items():
            if key.startswith(prefix):
                indicators[name] = str(value).lower() if value is not None else None
    keep = ("area", "country", "producercountry", "admin_level_1", "centroid_lon", "centroid_lat", "in_waterbody", "whisp_processing_metadata")
    details = {k: p[k] for k in keep if k in p}
    return (str(farm_id) if farm_id is not None else None), risk, indicators, details


class WhispProvider:
    name = "whisp"

    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        if not settings.whisp_api_key:
            raise ScreeningUnavailable(
                "Whisp needs an API key: sign in at whisp.openforis.org, create a key on your "
                "account page, and set EUDR_WHISP_API_KEY in .env"
            )
        self.settings = settings
        self.base = settings.whisp_base_url.rstrip("/")
        self.client = client or httpx.Client(timeout=120)

    def _headers(self):
        return {"x-api-key": self.settings.whisp_api_key, "Accept": "application/json"}

    def _poll(self, token: str) -> dict:
        deadline = time.monotonic() + self.settings.whisp_timeout_seconds
        delay = 3.0
        while time.monotonic() < deadline:
            time.sleep(delay)
            delay = min(delay * 1.5, 20)
            r = self.client.get(f"{self.base}/api/status/{token}", headers=self._headers())
            body = _json(r)
            code = body.get("code")
            if r.status_code == 200 and code == "analysis_completed":
                return body.get("data") or {}
            if r.status_code == 202 or code in {"analysis_queued", "analysis_processing"}:
                continue
            raise ScreeningError(f"Whisp status {r.status_code}: {body.get('message') or code}")
        raise ScreeningError("Whisp didn't finish in time; try again later")

    def screen(self, plots: list[PlotToScreen], commodity: str) -> list[ScreeningResult]:
        risk_column = COMMODITY_RISK_COLUMN.get(commodity, "risk_pcrop")
        options = {"externalIdColumn": "external_id", "async": len(plots) > 20}
        codes = [c.strip().lower() for c in self.settings.whisp_national_codes.split(",") if c.strip()]
        if codes:
            options["nationalCodes"] = codes
        body = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"external_id": p.farm_id},
                    "geometry": {"type": "Polygon", "coordinates": [p.ring]},
                }
                for p in plots
            ],
            "analysisOptions": options,
        }
        r = self.client.post(f"{self.base}/api/submit/geojson", json=body, headers=self._headers())
        payload = _json(r)
        code = payload.get("code")
        if r.status_code == 200 and code == "analysis_completed":
            data = payload.get("data") or {}
        elif r.status_code == 202 or code == "analysis_queued":
            token = (payload.get("data") or {}).get("token")
            if not token:
                raise ScreeningError("Whisp queued the job but returned no token")
            data = self._poll(token)
        elif r.status_code == 401:
            raise ScreeningError("Whisp rejected the API key (expired or wrong?)")
        elif r.status_code == 429:
            raise ScreeningError("Whisp rate limit reached; try again in a few minutes")
        else:
            raise ScreeningError(f"Whisp error {r.status_code}: {payload.get('message') or code or r.text[:200]}")

        results = []
        for feature in data.get("features", []):
            farm_id, risk, indicators, details = parse_whisp_feature(feature.get("properties") or {}, risk_column)
            if farm_id and risk:
                results.append(ScreeningResult(farm_id, risk, indicators, {**details, "risk_column": risk_column}))
        return results


class DemoProvider:
    """Deterministic fake results so demos work offline. Clearly labelled."""

    name = "demo"

    def screen(self, plots: list[PlotToScreen], commodity: str) -> list[ScreeningResult]:
        out = []
        for p in plots:
            bucket = int(p.polygon_hash[:8], 16) % 100
            risk = RISK_LOW if bucket < 65 else RISK_MORE_INFO if bucket < 92 else RISK_HIGH
            indicators = {
                "treecover_2020": "yes" if risk != RISK_LOW or bucket % 2 else "no",
                "commodities_2020": "yes" if risk == RISK_LOW else "no",
                "disturbance_before_2020": "no",
                "disturbance_after_2020": "yes" if risk == RISK_HIGH else "no",
            }
            out.append(ScreeningResult(p.farm_id, risk, indicators, {"demo": True}))
        return out


def get_provider(settings: Settings):
    name = (settings.screening_provider or "none").lower()
    if name == "whisp":
        return WhispProvider(settings)
    if name == "demo":
        return DemoProvider()
    raise ScreeningUnavailable(
        "Deforestation screening is switched off. Set EUDR_SCREENING_PROVIDER=whisp (with "
        "EUDR_WHISP_API_KEY) or =demo in .env"
    )


def _json(r: httpx.Response) -> dict:
    try:
        body = r.json()
        return body if isinstance(body, dict) else {"data": body}
    except ValueError:
        return {"message": r.text[:300]}


def latest_screenings(db: Session, farm_ids: list[str]) -> dict[str, models.FarmScreening]:
    if not farm_ids:
        return {}
    rows = (
        db.query(models.FarmScreening)
        .filter(models.FarmScreening.farm_id.in_(farm_ids))
        .order_by(models.FarmScreening.screened_at.asc())
        .all()
    )
    latest: dict[str, models.FarmScreening] = {}
    for row in rows:
        latest[str(row.farm_id)] = row  # ascending order -> last wins
    return latest


def run_screening_job(job_id: str, session_factory=None, provider=None, commodity: str = "cocoa") -> None:
    """Runs one queued job to completion. Opens its own DB session so it can
    run in a background task after the HTTP request has returned."""
    if session_factory is None:
        from app.database import SessionLocal as session_factory  # noqa: N813
    settings = get_settings()
    db: Session = session_factory()
    job = db.get(models.ScreeningJob, job_id)
    if job is None:
        db.close()
        return
    try:
        job.status = "running"
        db.commit()
        provider = provider or get_provider(settings)
        farms = db.query(models.Farm).filter(models.Farm.id.in_(job.farm_ids or [])).all()
        plots = [p for p in (plot_for(f) for f in farms) if p]
        by_id = {p.farm_id: p for p in plots}
        size = max(1, settings.whisp_batch_size)
        for start in range(0, len(plots), size):
            chunk = plots[start : start + size]
            for res in provider.screen(chunk, commodity):
                plot = by_id.get(res.farm_id)
                if plot is None:
                    continue
                db.add(
                    models.FarmScreening(
                        organization_id=job.organization_id,
                        farm_id=res.farm_id,
                        job_id=str(job.id),
                        provider=provider.name,
                        commodity=commodity,
                        risk=res.risk,
                        indicators=res.indicators,
                        details=res.details,
                        polygon_hash=plot.polygon_hash,
                    )
                )
                job.done_count += 1
            db.commit()
        job.status = "done"
        if job.done_count < len(plots):
            job.error = f"{len(plots) - job.done_count} plot(s) came back without a result"
    except Exception as exc:  # recorded on the job so the dashboard can show it
        db.rollback()
        job = db.get(models.ScreeningJob, job_id)
        job.status = "failed"
        job.error = str(exc)[:1000]
    finally:
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.close()
