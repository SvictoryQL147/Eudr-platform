from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

# --- Auth / Users ---------------------------------------------------------


class RegisterIn(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    organization_id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime | None = None

    @field_validator("role", mode="before")
    @classmethod
    def _role(cls, v: Any) -> str:
        return v.value if hasattr(v, "value") else v

    model_config = {"from_attributes": True}


class OrganizationOut(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    organization: OrganizationOut


class MeOut(BaseModel):
    user: UserOut
    organization: OrganizationOut


class UserCreate(BaseModel):
    name: str = Field(min_length=2)
    email: str
    role: str = "exporter_staff"
    # Optional: field agents can be created without a dashboard login.
    password: str | None = Field(default=None, min_length=8)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower()


# --- Farmer / Farm ----------------------------------------------------


class FarmerCreate(BaseModel):
    # Ignored if sent: the organization always comes from the signed-in user.
    organization_id: str | None = None
    full_name: str = Field(min_length=2)
    phone_number: str | None = None
    national_id_number: str | None = None
    community: str | None = None
    state: str | None = None


class FarmerUpdate(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    national_id_number: str | None = None
    community: str | None = None
    state: str | None = None


class FarmerOut(BaseModel):
    id: str
    full_name: str
    phone_number: str | None
    national_id_number: str | None
    community: str | None = None
    state: str | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class FarmerListItem(FarmerOut):
    farm_count: int = 0
    mapped_farm_count: int = 0
    total_hectares: float = 0.0


class FarmCreate(BaseModel):
    organization_id: str | None = None
    farmer_id: str | None = None
    name: str | None = None
    # GeoJSON-style ring: [[lon, lat], [lon, lat], ...]. Optional — a farm
    # can be registered before it's mapped; missing_geolocation will flag it.
    polygon_ring: list[tuple[float, float]] | None = None
    area_hectares: float | None = None


class FarmUpdate(BaseModel):
    farmer_id: str | None = None
    name: str | None = None
    polygon_ring: list[tuple[float, float]] | None = None
    clear_polygon: bool = False


class FarmOut(BaseModel):
    id: str
    farmer_id: str | None
    name: str | None
    area_hectares: float | None
    model_config = {"from_attributes": True}


class FarmDetail(FarmOut):
    farmer_name: str | None = None
    has_geolocation: bool = False
    polygon_ring: list[list[float]] | None = None  # [[lon, lat], ...]
    centroid: list[float] | None = None  # [lon, lat]
    polygon_is_valid: bool | None = None
    harvested_kg: float = 0.0
    collected_kg: float = 0.0
    created_at: datetime | None = None
    # Latest deforestation screening of the CURRENT boundary (None = not screened)
    deforestation_risk: str | None = None
    screening_provider: str | None = None
    screened_at: datetime | None = None
    screening_indicators: dict | None = None
    screening_outdated: bool = False  # screened, but boundary changed since


# --- Harvest / Collection ------------------------------------------------


class HarvestCreate(BaseModel):
    farm_id: str
    harvest_date: date | None = None
    quantity_kg: float = Field(gt=0)


class HarvestOut(BaseModel):
    id: str
    farm_id: str
    harvest_date: date | None
    quantity_kg: float
    model_config = {"from_attributes": True}


class HarvestListItem(HarvestOut):
    farm_name: str | None = None
    farmer_name: str | None = None
    created_at: datetime | None = None


class CollectionEventCreate(BaseModel):
    farm_id: str
    agent_user_id: str | None = None
    weight_kg: float = Field(gt=0)
    quality_grade: str | None = None
    location_recorded: bool = False
    collected_at: datetime | None = None


class CollectionEventOut(BaseModel):
    id: str
    farm_id: str
    weight_kg: float
    model_config = {"from_attributes": True}


class CollectionListItem(CollectionEventOut):
    farm_name: str | None = None
    farmer_name: str | None = None
    agent_name: str | None = None
    agent_user_id: str | None = None
    quality_grade: str | None = None
    location_recorded: bool = False
    collected_at: datetime | None = None
    created_at: datetime | None = None
    batched_kg: float = 0.0
    available_kg: float = 0.0


# --- Batch / Shipment ------------------------------------------------------


class BatchInputCreate(BaseModel):
    collection_event_id: str
    quantity_kg: float = Field(gt=0)


class BatchCreate(BaseModel):
    organization_id: str | None = None
    output_kg: float = Field(gt=0)
    inputs: list[BatchInputCreate] = Field(default_factory=list)


class BatchOut(BaseModel):
    id: str
    output_kg: float
    model_config = {"from_attributes": True}


class BatchInputDetail(BaseModel):
    collection_event_id: str
    quantity_kg: float
    farm_id: str | None = None
    farm_name: str | None = None
    farmer_name: str | None = None


class BatchListItem(BatchOut):
    created_at: datetime | None = None
    input_total_kg: float = 0.0
    input_count: int = 0
    farm_count: int = 0
    shipment_ids: list[str] = Field(default_factory=list)
    inputs: list[BatchInputDetail] = Field(default_factory=list)


class ShipmentCreate(BaseModel):
    organization_id: str | None = None
    destination_country: str | None = None
    buyer_name: str | None = None
    reference: str | None = None
    commodity: str = "cocoa"
    hs_code: str = "1801"
    batch_ids: list[str] = Field(default_factory=list)


class ShipmentUpdate(BaseModel):
    destination_country: str | None = None
    buyer_name: str | None = None
    reference: str | None = None
    commodity: str | None = None
    hs_code: str | None = None
    add_batch_ids: list[str] = Field(default_factory=list)
    remove_batch_ids: list[str] = Field(default_factory=list)


class ShipmentOut(BaseModel):
    id: str
    destination_country: str | None
    buyer_name: str | None
    reference: str | None = None
    commodity: str | None = None
    hs_code: str | None = None
    model_config = {"from_attributes": True}


class ShipmentListItem(ShipmentOut):
    created_at: datetime | None = None
    batch_count: int = 0
    net_mass_kg: float = 0.0
    latest_score: int | None = None
    is_blocked: bool | None = None
    last_assessed_at: datetime | None = None
    open_findings: int = 0


# --- Document -----------------------------------------------------------


class DocumentCreate(BaseModel):
    organization_id: str | None = None
    document_type: str
    linked_to_type: str
    linked_to_id: str
    object_key: str
    expiry_date: date | None = None


class DocumentOut(BaseModel):
    id: str
    document_type: str
    linked_to_type: str
    linked_to_id: str
    expiry_date: date | None
    original_filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime | None = None
    has_file: bool = False

    @field_validator("document_type", "linked_to_type", mode="before")
    @classmethod
    def _enum(cls, v: Any) -> str:
        return v.value if hasattr(v, "value") else v

    model_config = {"from_attributes": True}


# --- Compliance -----------------------------------------------------------


class FindingOut(BaseModel):
    rule_id: str
    severity: str
    title: str
    message: str
    remediation: str
    entity_type: str
    entity_id: str


class ReadinessOut(BaseModel):
    shipment_id: str
    score: int
    is_blocked: bool
    computed_at: datetime
    findings: list[FindingOut]


class AssessmentSummary(BaseModel):
    id: str
    score: int
    is_blocked: bool
    computed_at: datetime
    finding_count: int
