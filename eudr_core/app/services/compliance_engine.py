from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import core as models
from app.services.rules import (
    batch_rules,
    collection_rules,
    deforestation_rules,
    document_rules,
    farm_rules,
    farmer_rules,
    harvest_rules,
    shipment_rules,
)
from app.services.rules.base import Finding
from app.services.rules.context import (
    AssessmentContext,
    BatchContext,
    CollectionEventContext,
    DocumentContext,
    FarmContext,
    FarmerContext,
    HarvestContext,
    ShipmentContext,
)

# Order doesn't affect the result (findings are independent), but keeping
# it stable makes assessment output diffs readable across runs.
ALL_RULES = [
    *farm_rules.RULES,
    *deforestation_rules.RULES,
    *farmer_rules.RULES,
    *harvest_rules.RULES,
    *collection_rules.RULES,
    *batch_rules.RULES,
    *document_rules.RULES,
    *shipment_rules.RULES,
]


def run_all_rules(ctx: AssessmentContext, settings: Settings) -> list[Finding]:
    findings: list[Finding] = []
    for rule in ALL_RULES:
        findings.extend(rule(ctx, settings))
    return findings


def build_context_from_db(shipment_id: str, db: Session) -> AssessmentContext:
    """The only place in the compliance layer that touches the ORM. Walks
    shipment -> batches -> batch inputs -> collection events -> farms ->
    farmers, plus every document linked anywhere in that graph, and
    flattens it all into the DB-independent dataclasses the rules
    actually run against."""
    shipment = db.get(models.Shipment, shipment_id)
    if shipment is None:
        raise ValueError(f"Shipment {shipment_id} not found")

    batch_ids = [link.batch_id for link in shipment.batch_links]
    batches_orm = [b for b in (db.get(models.Batch, bid) for bid in batch_ids) if b is not None]

    collection_event_ids: set[str] = set()
    batch_contexts: dict[str, BatchContext] = {}
    farm_ids: set[str] = set()

    for batch in batches_orm:
        input_ids = [bi.collection_event_id for bi in batch.inputs]
        input_total = sum(bi.quantity_kg for bi in batch.inputs)
        input_farm_ids = list({
            db.get(models.CollectionEvent, bi.collection_event_id).farm_id
            for bi in batch.inputs
            if db.get(models.CollectionEvent, bi.collection_event_id) is not None
        })
        collection_event_ids.update(input_ids)
        farm_ids.update(input_farm_ids)

        batch_contexts[batch.id] = BatchContext(
            id=batch.id,
            output_kg=batch.output_kg,
            input_collection_event_ids=input_ids,
            input_total_kg=input_total,
            input_farm_ids=input_farm_ids,
        )

    collection_contexts: dict[str, CollectionEventContext] = {}
    for ce_id in collection_event_ids:
        ce = db.get(models.CollectionEvent, ce_id)
        if ce is None:
            continue
        collection_contexts[ce.id] = CollectionEventContext(
            id=ce.id,
            farm_id=ce.farm_id,
            agent_user_id=ce.agent_user_id,
            location_recorded=ce.location_recorded,
            weight_kg=ce.weight_kg,
        )
        farm_ids.add(ce.farm_id)

    from app.services.deforestation import latest_screenings, polygon_hash

    screenings = latest_screenings(db, list(farm_ids))
    farm_contexts: dict[str, FarmContext] = {}
    farmer_ids: set[str] = set()
    harvest_contexts: list[HarvestContext] = []

    for farm_id in farm_ids:
        farm = db.get(models.Farm, farm_id)
        if farm is None:
            continue

        polygon_coords = None
        polygon_is_valid = True
        if farm.polygon is not None:
            shape = to_shape(farm.polygon)
            polygon_is_valid = shape.is_valid
            polygon_coords = [(lat, lon) for lon, lat in shape.exterior.coords]

        farm_contexts[farm.id] = FarmContext(
            id=farm.id,
            farmer_id=farm.farmer_id,
            has_geolocation=farm.polygon is not None,
            polygon_coords=polygon_coords,
            polygon_area_hectares=farm.area_hectares,
            polygon_is_valid=polygon_is_valid,
            **_screening_fields(farm, screenings.get(str(farm.id)), polygon_hash),
        )
        if farm.farmer_id:
            farmer_ids.add(farm.farmer_id)

        for harvest in farm.harvests:
            harvest_contexts.append(
                HarvestContext(
                    id=harvest.id,
                    farm_id=harvest.farm_id,
                    harvest_date=harvest.harvest_date,
                    quantity_kg=harvest.quantity_kg,
                )
            )

    farmer_contexts: dict[str, FarmerContext] = {}
    for farmer_id in farmer_ids:
        farmer = db.get(models.Farmer, farmer_id)
        if farmer is None:
            continue
        farmer_contexts[farmer.id] = FarmerContext(
            id=farmer.id,
            has_national_id=bool(farmer.national_id_number),
            has_phone_number=bool(farmer.phone_number),
        )

    linked_ids = (
        [shipment_id]
        + batch_ids
        + list(farmer_ids)
    )
    documents_orm = (
        db.query(models.Document)
        .filter(models.Document.linked_to_id.in_(linked_ids))
        .all()
    )
    document_contexts = [
        DocumentContext(
            id=d.id,
            document_type=d.document_type.value,
            linked_to_type=d.linked_to_type.value,
            linked_to_id=d.linked_to_id,
            expiry_date=d.expiry_date,
        )
        for d in documents_orm
    ]

    return AssessmentContext(
        shipment=ShipmentContext(
            id=shipment.id,
            destination_country=shipment.destination_country,
            buyer_name=shipment.buyer_name,
            batch_ids=batch_ids,
        ),
        batches=batch_contexts,
        collection_events=collection_contexts,
        harvests=harvest_contexts,
        farms=farm_contexts,
        farmers=farmer_contexts,
        documents=document_contexts,
    )


def _screening_fields(farm, screening, polygon_hash) -> dict:
    """Only a screening of the farm's current boundary counts."""
    if screening is None or farm.polygon is None or screening.polygon_hash != polygon_hash(farm):
        return {"deforestation_risk": None, "screening_provider": None}
    return {"deforestation_risk": screening.risk, "screening_provider": screening.provider}
