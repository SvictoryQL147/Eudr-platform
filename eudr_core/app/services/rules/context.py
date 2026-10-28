"""
Rules never touch the ORM or a DB session directly — they operate on
these plain dataclasses. That's deliberate: it's what let
services/boundary_verification.py in the WalkProof service be fully unit
tested with no database, and the same property is worth more here, since
this is the module doing the actual EUDR compliance judgment calls.
`services/compliance_engine.py` is the only place that loads real ORM
objects and assembles them into an AssessmentContext.
"""
from dataclasses import dataclass, field
from datetime import date, datetime, timezone


@dataclass
class FarmerContext:
    id: str
    has_national_id: bool
    has_phone_number: bool


@dataclass
class FarmContext:
    id: str
    farmer_id: str | None
    has_geolocation: bool
    polygon_coords: list[tuple[float, float]] | None  # (lat, lon) exterior ring, or None
    polygon_area_hectares: float | None
    polygon_is_valid: bool  # False if self-intersecting / degenerate
    # Latest deforestation screening for the CURRENT boundary: "low" | "high"
    # | "more_info_needed", or None if never screened / boundary changed since.
    deforestation_risk: str | None = None
    screening_provider: str | None = None


@dataclass
class HarvestContext:
    id: str
    farm_id: str
    harvest_date: date | None
    quantity_kg: float


@dataclass
class CollectionEventContext:
    id: str
    farm_id: str
    agent_user_id: str | None
    location_recorded: bool
    weight_kg: float


@dataclass
class BatchContext:
    id: str
    output_kg: float
    input_collection_event_ids: list[str]
    input_total_kg: float
    input_farm_ids: list[str]


@dataclass
class DocumentContext:
    id: str
    document_type: str
    linked_to_type: str  # "farmer" | "batch" | "shipment"
    linked_to_id: str
    expiry_date: date | None


@dataclass
class ShipmentContext:
    id: str
    destination_country: str | None
    buyer_name: str | None
    batch_ids: list[str]


@dataclass
class AssessmentContext:
    """Everything a rule might need for one shipment's assessment, already
    resolved and indexed. `evaluated_at` is injected (not datetime.now())
    so date-sanity rules are deterministic and testable."""

    shipment: ShipmentContext
    batches: dict[str, BatchContext]
    collection_events: dict[str, CollectionEventContext]
    harvests: list[HarvestContext]
    farms: dict[str, FarmContext]
    farmers: dict[str, FarmerContext]
    documents: list[DocumentContext]
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def harvests_for_farm(self, farm_id: str) -> list[HarvestContext]:
        return [h for h in self.harvests if h.farm_id == farm_id]

    def collections_for_farm(self, farm_id: str) -> list[CollectionEventContext]:
        return [c for c in self.collection_events.values() if c.farm_id == farm_id]

    def documents_for(self, linked_to_type: str, linked_to_id: str) -> list[DocumentContext]:
        return [
            d for d in self.documents
            if d.linked_to_type == linked_to_type and d.linked_to_id == linked_to_id
        ]
