"""
Implements the strategy doc's section 11 minimum viable core:

    Organization -> User -> Role
    Farmer -> Identity/Profile -> Documents
    Farm/Plot -> Polygon -> Area -> Location metadata
    Harvest -> Quantity -> Date -> Farm
    Collection Event -> Farmer/Farm -> Weight -> Quality -> Agent
    Batch/Lot -> Inputs -> Transformations -> Outputs
    Shipment -> Batches -> Destination -> Buyer
    Evidence / Compliance Assessment -> Rules -> Findings -> Severity -> Resolution

Warehouse/Movement and full Risk Assessment (satellite-derived) are
intentionally out of scope here — they depend on infrastructure (object
storage for movement events, satellite provider APIs) this pass doesn't
stand up. See README "what's not built" for the full list.
"""
import enum
import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    COMPLIANCE_REVIEWER = "compliance_reviewer"
    FIELD_AGENT = "field_agent"
    EXPORTER_STAFF = "exporter_staff"


class DocumentType(str, enum.Enum):
    FARMER_ID = "farmer_id"
    LAND_TITLE = "land_title"
    PURCHASE_RECEIPT = "purchase_receipt"
    EXPORT_CERTIFICATE = "export_certificate"
    PHYTOSANITARY_CERTIFICATE = "phytosanitary_certificate"
    OTHER = "other"


class LinkedEntityType(str, enum.Enum):
    FARMER = "farmer"
    BATCH = "batch"
    SHIPMENT = "shipment"


class FindingSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FindingStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    WAIVED = "waived"  # explicit human override, requires reviewer + reason


# --- Organization / User -----------------------------------------------

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]))
    # Nullable so field agents can exist as records (for collection events)
    # without a dashboard login.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --- Farmer / Farm -------------------------------------------------------

class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    national_id_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    community: Mapped[str | None] = mapped_column(String(255), nullable=True)
    state: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farms: Mapped[list["Farm"]] = relationship(back_populates="farmer")


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    farmer_id: Mapped[str | None] = mapped_column(ForeignKey("farmers.id"), nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Nullable deliberately — "missing geolocation" is itself a compliance
    # finding (see services/rules/farm_rules.py), not something we should
    # force at the DB layer and lose visibility into.
    polygon: Mapped[str | None] = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
    area_hectares: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farmer: Mapped["Farmer | None"] = relationship(back_populates="farms")
    harvests: Mapped[list["Harvest"]] = relationship(back_populates="farm")
    collection_events: Mapped[list["CollectionEvent"]] = relationship(back_populates="farm")


# --- Harvest / Collection -------------------------------------------------

class Harvest(Base):
    """A farmer's self-reported harvest — the doc's Harvest -> Quantity ->
    Date -> Farm. Distinct from CollectionEvent: a harvest is what the
    farmer says they picked, a collection event is what an agent actually
    weighed and took away. Comparing the two is rule
    collection_weight_exceeds_harvest in services/rules/collection_rules.py."""

    __tablename__ = "harvests"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    farm_id: Mapped[str] = mapped_column(ForeignKey("farms.id"), index=True)
    harvest_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="harvests")


class CollectionEvent(Base):
    __tablename__ = "collection_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    farm_id: Mapped[str] = mapped_column(ForeignKey("farms.id"), index=True)
    agent_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    weight_kg: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str | None] = mapped_column(String(64), nullable=True)
    location_recorded: Mapped[bool] = mapped_column(default=False)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="collection_events")
    batch_inputs: Mapped[list["BatchInput"]] = relationship(back_populates="collection_event")


# --- Batch / Shipment ------------------------------------------------------

class Batch(Base):
    """Batch/Lot -> Inputs -> Transformations -> Outputs. `output_kg` is
    what left the batching process; the sum of linked BatchInput.quantity_kg
    is what went in. Rule batch_quantity_mismatch in
    services/rules/batch_rules.py checks the two agree within tolerance —
    the core anti-fraud check against phantom volume entering the chain."""

    __tablename__ = "batches"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    output_kg: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inputs: Mapped[list["BatchInput"]] = relationship(back_populates="batch")
    shipment_links: Mapped[list["ShipmentBatch"]] = relationship(back_populates="batch")


class BatchInput(Base):
    """Link table: which collection events (and therefore which farms)
    fed into a batch, and how much of each. This is the edge the
    traceability graph (strategy doc section 2) walks backward from
    shipment to farm."""

    __tablename__ = "batch_inputs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"), index=True)
    collection_event_id: Mapped[str] = mapped_column(ForeignKey("collection_events.id"), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)

    batch: Mapped["Batch"] = relationship(back_populates="inputs")
    collection_event: Mapped["CollectionEvent"] = relationship(back_populates="batch_inputs")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    destination_country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    buyer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    commodity: Mapped[str] = mapped_column(String(64), default="cocoa")
    hs_code: Mapped[str] = mapped_column(String(16), default="1801")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch_links: Mapped[list["ShipmentBatch"]] = relationship(back_populates="shipment")
    assessments: Mapped[list["ComplianceAssessment"]] = relationship(back_populates="shipment")


class ShipmentBatch(Base):
    __tablename__ = "shipment_batches"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    shipment_id: Mapped[str] = mapped_column(ForeignKey("shipments.id"), index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"), index=True)

    shipment: Mapped["Shipment"] = relationship(back_populates="batch_links")
    batch: Mapped["Batch"] = relationship(back_populates="shipment_links")


# --- Document / Evidence ----------------------------------------------------

class Document(Base):
    """Evidence -> Source -> Entity -> Timestamp. `linked_to_type` +
    `linked_to_id` is a lightweight polymorphic FK (farmer/batch/shipment)
    rather than three nullable FK columns — deliberate simplicity for a
    first pass; revisit if document volume or query patterns justify a
    proper join table per entity type."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type", values_callable=lambda e: [m.value for m in e]))
    linked_to_type: Mapped[LinkedEntityType] = mapped_column(
        Enum(LinkedEntityType, name="linked_entity_type", values_callable=lambda e: [m.value for m in e])
    )
    linked_to_id: Mapped[str] = mapped_column(String(64), index=True)

    object_key: Mapped[str] = mapped_column(String(512))
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Structured fields pulled by OCR — see services/ocr.py. Nullable
    # because extraction is async and can fail; a document with no
    # extraction yet is not itself a compliance failure.
    extracted_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --- Compliance ---------------------------------------------------------

class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    shipment_id: Mapped[str] = mapped_column(ForeignKey("shipments.id"), index=True)
    readiness_score: Mapped[int] = mapped_column(Integer)
    is_blocked: Mapped[bool] = mapped_column(default=False)  # True if any CRITICAL finding is open
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shipment: Mapped["Shipment"] = relationship(back_populates="assessments")
    findings: Mapped[list["ComplianceFinding"]] = relationship(back_populates="assessment")


class ComplianceFinding(Base):
    __tablename__ = "compliance_findings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("compliance_assessments.id"), index=True)

    rule_id: Mapped[str] = mapped_column(String(128), index=True)
    severity: Mapped[FindingSeverity] = mapped_column(Enum(FindingSeverity, name="finding_severity", values_callable=lambda e: [m.value for m in e]))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    remediation: Mapped[str] = mapped_column(Text)

    entity_type: Mapped[str] = mapped_column(String(64))  # "farm" | "harvest" | "batch" | ...
    entity_id: Mapped[str] = mapped_column(String(64))

    status: Mapped[FindingStatus] = mapped_column(
        Enum(FindingStatus, name="finding_status", values_callable=lambda e: [m.value for m in e]), default=FindingStatus.OPEN
    )
    reviewer_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assessment: Mapped["ComplianceAssessment"] = relationship(back_populates="findings")


# --- Deforestation screening ---------------------------------------------


class FarmScreening(Base):
    """One deforestation-risk result for one farm boundary. Immutable: a
    re-screen adds a new row. `polygon_hash` records which boundary was
    screened, so a result goes stale the moment the boundary is redrawn."""

    __tablename__ = "farm_screenings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    farm_id: Mapped[str] = mapped_column(ForeignKey("farms.id"), index=True)
    job_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(32))  # "whisp" | "demo"
    commodity: Mapped[str] = mapped_column(String(64), default="cocoa")
    risk: Mapped[str] = mapped_column(String(32))  # "low" | "high" | "more_info_needed"
    indicators: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    polygon_hash: Mapped[str] = mapped_column(String(64))
    screened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScreeningJob(Base):
    __tablename__ = "screening_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    requested_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued|running|done|failed
    farm_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    farm_count: Mapped[int] = mapped_column(Integer, default=0)
    done_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
