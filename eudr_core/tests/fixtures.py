"""
`clean_context()` builds a shipment that should pass every one of the 20
rules (21 since deforestation screening). Every rule test starts from this and breaks exactly one thing —
that's what proves each rule fires on its specific condition and nothing
else fires as a side effect.
"""
from datetime import date, datetime

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

EVAL_DATE = datetime(2026, 8, 19)


def clean_farm(farm_id="farm-1", farmer_id="farmer-1", area=1.2) -> FarmContext:
    return FarmContext(
        id=farm_id,
        farmer_id=farmer_id,
        has_geolocation=True,
        polygon_coords=[(6.520, 3.370), (6.521, 3.370), (6.521, 3.371), (6.520, 3.371)],
        polygon_area_hectares=area,
        polygon_is_valid=True,
        deforestation_risk="low",
        screening_provider="whisp",
    )


def clean_farmer(farmer_id="farmer-1") -> FarmerContext:
    return FarmerContext(id=farmer_id, has_national_id=True, has_phone_number=True)


def clean_context() -> AssessmentContext:
    farm = clean_farm()
    farmer = clean_farmer()
    harvest = HarvestContext(id="harvest-1", farm_id=farm.id, harvest_date=date(2026, 6, 1), quantity_kg=500)
    collection = CollectionEventContext(
        id="collection-1", farm_id=farm.id, agent_user_id="agent-1",
        location_recorded=True, weight_kg=480,
    )
    batch = BatchContext(
        id="batch-1", output_kg=480,
        input_collection_event_ids=[collection.id], input_total_kg=480,
        input_farm_ids=[farm.id],
    )
    shipment = ShipmentContext(
        id="shipment-1", destination_country="Netherlands", buyer_name="ACME BV",
        batch_ids=[batch.id],
    )
    document = DocumentContext(
        id="doc-1", document_type="export_certificate", linked_to_type="shipment",
        linked_to_id=shipment.id, expiry_date=date(2027, 1, 1),
    )

    return AssessmentContext(
        shipment=shipment,
        batches={batch.id: batch},
        collection_events={collection.id: collection},
        harvests=[harvest],
        farms={farm.id: farm},
        farmers={farmer.id: farmer},
        documents=[document],
        evaluated_at=EVAL_DATE,
    )
