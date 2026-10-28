"""
The shipment evidence pack — what an exporter hands to its EU buyer so the
buyer can file its due diligence statement (DDS) under the EUDR.

Two outputs:
  * build_geojson(): a GeoJSON FeatureCollection of every production plot
    that fed the shipment. EUDR geolocation is submitted to the EU
    Information System (TRACES) as GeoJSON in WGS84 (EPSG:4326), and the
    Commission's guidance asks for at least 6 decimal places. Property
    names follow the EU's GeoJSON guidance (ProducerName, ProducerCountry,
    ProductionPlace, Area) — check them against the current TRACES spec
    before relying on direct upload.
  * build_evidence_pack(): the full JSON bundle — shipment, chain of
    custody (shipment -> batch -> collection -> farm -> farmer), plots,
    documents, latest compliance assessment, and a SHA-256 hash of the
    content so a buyer can tell if the pack was edited after export.

Deforestation screening: each plot's latest Whisp result for its current
boundary is included. Plots never screened (or redrawn since) are listed
as not screened; DEMO results are labelled as such and must never be sent
to a buyer as evidence.
"""
import hashlib
import json
from datetime import datetime, timezone

from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.models import core as models

PRODUCER_COUNTRY = "NG"
EUDR_DEFORESTATION_CUTOFF = "2020-12-31"


def _r6(v: float) -> float:
    return round(v, 6)


def _chain(shipment: models.Shipment, db: Session):
    batches, ces, farms = [], {}, {}
    for link in shipment.batch_links:
        batch = link.batch
        if batch is None:
            continue
        batches.append(batch)
        for bi in batch.inputs:
            ce = bi.collection_event
            if ce is None:
                continue
            ces[str(ce.id)] = ce
            if ce.farm is not None:
                farms[str(ce.farm.id)] = ce.farm
    return batches, ces, farms


def _farm_feature(farm: models.Farm, kg_from_farm: float, screening=None) -> dict | None:
    if farm.polygon is None:
        return None
    shape = to_shape(farm.polygon)
    ring = [[_r6(x), _r6(y)] for x, y in shape.exterior.coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    farmer = farm.farmer
    place = ", ".join(p for p in [farmer.community if farmer else None, farmer.state if farmer else None] if p)
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "ProducerName": farmer.full_name if farmer else None,
            "ProducerCountry": PRODUCER_COUNTRY,
            "ProductionPlace": place or farm.name,
            "Area": round(farm.area_hectares, 4) if farm.area_hectares is not None else None,
            "FarmId": str(farm.id),
            "FarmName": farm.name,
            "QuantityKgInShipment": round(kg_from_farm, 3),
            "DeforestationRisk": screening.risk if screening else None,
        },
    }


def _kg_by_farm(batches) -> dict[str, float]:
    out: dict[str, float] = {}
    for batch in batches:
        for bi in batch.inputs:
            ce = bi.collection_event
            if ce is not None:
                out[str(ce.farm_id)] = out.get(str(ce.farm_id), 0.0) + bi.quantity_kg
    return out


def _current_screenings(db: Session, farms: dict) -> dict:
    from app.services.deforestation import latest_screenings, polygon_hash

    latest = latest_screenings(db, list(farms.keys()))
    return {
        fid: s for fid, s in latest.items()
        if farms[fid].polygon is not None and s.polygon_hash == polygon_hash(farms[fid])
    }


def build_geojson(shipment: models.Shipment, db: Session) -> dict:
    batches, _, farms = _chain(shipment, db)
    kg = _kg_by_farm(batches)
    screened = _current_screenings(db, farms)
    features = [
        f for f in (_farm_feature(farm, kg.get(fid, 0.0), screened.get(fid)) for fid, farm in farms.items()) if f
    ]
    return {"type": "FeatureCollection", "features": features}


def build_evidence_pack(shipment: models.Shipment, db: Session) -> dict:
    org = db.get(models.Organization, shipment.organization_id)
    batches, ces, farms = _chain(shipment, db)
    kg = _kg_by_farm(batches)
    farmer_ids = {str(f.farmer_id) for f in farms.values() if f.farmer_id}
    linked_ids = [str(shipment.id)] + [str(b.id) for b in batches] + list(farmer_ids)
    documents = (
        db.query(models.Document).filter(models.Document.linked_to_id.in_(linked_ids)).all() if linked_ids else []
    )
    latest = (
        db.query(models.ComplianceAssessment)
        .filter(models.ComplianceAssessment.shipment_id == shipment.id)
        .order_by(models.ComplianceAssessment.computed_at.desc())
        .first()
    )
    geo = build_geojson(shipment, db)
    unmapped = [
        {"farm_id": fid, "farm_name": f.name, "farmer": f.farmer.full_name if f.farmer else None}
        for fid, f in farms.items()
        if f.polygon is None
    ]
    net_mass = round(sum(b.output_kg for b in batches), 3)

    pack = {
        "pack_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "exporter": {"organization_id": str(org.id), "name": org.name} if org else None,
        "shipment": {
            "id": str(shipment.id),
            "reference": shipment.reference,
            "commodity": shipment.commodity,
            "hs_code": shipment.hs_code,
            "net_mass_kg": net_mass,
            "country_of_production": PRODUCER_COUNTRY,
            "destination_country": shipment.destination_country,
            "buyer_name": shipment.buyer_name,
            "created_at": shipment.created_at.isoformat() if shipment.created_at else None,
        },
        "dds_support": {
            "note": (
                "Supplier information for the EU operator's due diligence statement. "
                "The EU operator (importer) files the DDS in the EU Information System; "
                "this pack supplies the commodity, quantity, country of production and "
                "plot geolocation it needs."
            ),
            "hs_code": shipment.hs_code,
            "description": f"{(shipment.commodity or '').title()} — Nigeria",
            "net_mass_kg": net_mass,
            "countries_of_production": [PRODUCER_COUNTRY],
            "plot_count": len(farms),
            "mapped_plot_count": len(geo["features"]),
            "total_area_ha": round(sum(f.area_hectares or 0 for f in farms.values()), 4),
        },
        "geolocation": geo,
        "unmapped_plots": unmapped,
        "chain_of_custody": [
            {
                "batch_id": str(b.id),
                "batch_output_kg": b.output_kg,
                "inputs": [
                    {
                        "collection_event_id": str(bi.collection_event_id),
                        "quantity_kg": bi.quantity_kg,
                        "collected_at": (
                            bi.collection_event.collected_at.isoformat()
                            if bi.collection_event and bi.collection_event.collected_at
                            else None
                        ),
                        "location_recorded": bi.collection_event.location_recorded if bi.collection_event else None,
                        "farm_id": str(bi.collection_event.farm_id) if bi.collection_event else None,
                        "farm_name": bi.collection_event.farm.name if bi.collection_event and bi.collection_event.farm else None,
                        "farmer": (
                            bi.collection_event.farm.farmer.full_name
                            if bi.collection_event and bi.collection_event.farm and bi.collection_event.farm.farmer
                            else None
                        ),
                    }
                    for bi in b.inputs
                ],
            }
            for b in batches
        ],
        "producers": [
            {
                "farmer_id": str(f.farmer.id),
                "name": f.farmer.full_name,
                "community": f.farmer.community,
                "state": f.farmer.state,
                "has_national_id": bool(f.farmer.national_id_number),
                "farm_id": fid,
                "farm_area_ha": f.area_hectares,
                "kg_in_shipment": round(kg.get(fid, 0.0), 3),
            }
            for fid, f in farms.items()
            if f.farmer is not None
        ],
        "documents": [
            {
                "id": str(d.id),
                "type": d.document_type.value,
                "linked_to": f"{d.linked_to_type.value}:{d.linked_to_id}",
                "filename": d.original_filename,
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in documents
        ],
        "compliance_assessment": (
            {
                "assessment_id": str(latest.id),
                "readiness_score": latest.readiness_score,
                "is_blocked": latest.is_blocked,
                "computed_at": latest.computed_at.isoformat() if latest.computed_at else None,
                "rules_engine": "20 deterministic traceability and data-integrity rules",
                "findings": [
                    {
                        "rule_id": f.rule_id,
                        "severity": f.severity.value,
                        "title": f.title,
                        "message": f.message,
                        "remediation": f.remediation,
                    }
                    for f in latest.findings
                ],
            }
            if latest
            else None
        ),
        "deforestation_screening": _screening_section(db, farms),
    }
    canonical = json.dumps({k: v for k, v in pack.items() if k != "generated_at"}, sort_keys=True, default=str)
    pack["content_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return pack


def _screening_section(db: Session, farms: dict) -> dict:
    mapped = {fid: f for fid, f in farms.items() if f.polygon is not None}
    screened = _current_screenings(db, mapped)
    providers = sorted({s.provider for s in screened.values()})
    if not mapped or not screened:
        status = "not_performed"
    elif len(screened) < len(mapped):
        status = "partial"
    else:
        status = "performed"
    is_demo = "demo" in providers
    risks = [s.risk for s in screened.values()]
    note = {
        "performed": "Every mapped plot was screened against the EUDR cutoff using the Whisp convergence-of-evidence method (FAO / Forest Data Partnership).",
        "partial": "Some mapped plots have not been screened for their current boundary; see the per-plot list.",
        "not_performed": "Satellite deforestation screening has not been run for these plots. The buyer must complete its own risk assessment.",
    }[status]
    if is_demo:
        note = "DEMO RESULTS — generated for demonstration only, not a real satellite analysis. Do not send to a buyer."
    return {
        "status": status,
        "is_demo": is_demo,
        "method": "Whisp (What is in that plot?), FAO / Forest Data Partnership, open source (MIT)" if providers else None,
        "providers": providers,
        "cutoff_date": EUDR_DEFORESTATION_CUTOFF,
        "summary": {
            "plots_mapped": len(mapped),
            "plots_screened": len(screened),
            "low": risks.count("low"),
            "more_info_needed": risks.count("more_info_needed"),
            "high": risks.count("high"),
        },
        "plots": [
            {
                "farm_id": fid,
                "farm_name": f.name,
                "farmer": f.farmer.full_name if f.farmer else None,
                "risk": screened[fid].risk if fid in screened else None,
                "indicators": screened[fid].indicators if fid in screened else None,
                "provider": screened[fid].provider if fid in screened else None,
                "screened_at": screened[fid].screened_at.isoformat() if fid in screened and screened[fid].screened_at else None,
            }
            for fid, f in mapped.items()
        ],
        "note": note,
    }
