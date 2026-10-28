-- Quick-start DDL matching app/models/core.py. Swap for Alembic migrations
-- before this goes anywhere near production — this is a fast local-setup
-- path, not a migration strategy.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('admin', 'compliance_reviewer', 'field_agent', 'exporter_staff');
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL,
    password_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(64),
    national_id_number VARCHAR(128),
    community VARCHAR(255),
    state VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_users_organization_id ON users(organization_id);
CREATE INDEX ix_farmers_organization_id ON farmers(organization_id);

CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    farmer_id UUID REFERENCES farmers(id),
    name VARCHAR(255),
    polygon GEOMETRY(POLYGON, 4326),
    area_hectares FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_farms_farmer_id ON farms(farmer_id);
CREATE INDEX ix_farms_organization_id ON farms(organization_id);

CREATE TABLE harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id),
    harvest_date DATE,
    quantity_kg FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_harvests_farm_id ON harvests(farm_id);

CREATE TABLE collection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id),
    agent_user_id UUID REFERENCES users(id),
    weight_kg FLOAT NOT NULL,
    quality_grade VARCHAR(64),
    location_recorded BOOLEAN NOT NULL DEFAULT false,
    collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_collection_events_farm_id ON collection_events(farm_id);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    output_kg FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_batches_organization_id ON batches(organization_id);

CREATE TABLE batch_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id),
    collection_event_id UUID NOT NULL REFERENCES collection_events(id),
    quantity_kg FLOAT NOT NULL
);
CREATE INDEX ix_batch_inputs_batch_id ON batch_inputs(batch_id);
CREATE INDEX ix_batch_inputs_collection_event_id ON batch_inputs(collection_event_id);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    destination_country VARCHAR(128),
    buyer_name VARCHAR(255),
    reference VARCHAR(64),
    commodity VARCHAR(64) NOT NULL DEFAULT 'cocoa',
    hs_code VARCHAR(16) NOT NULL DEFAULT '1801',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_shipments_organization_id ON shipments(organization_id);

CREATE TABLE shipment_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    batch_id UUID NOT NULL REFERENCES batches(id)
);
CREATE INDEX ix_shipment_batches_shipment_id ON shipment_batches(shipment_id);
CREATE INDEX ix_shipment_batches_batch_id ON shipment_batches(batch_id);

CREATE TYPE document_type AS ENUM (
    'farmer_id', 'land_title', 'purchase_receipt',
    'export_certificate', 'phytosanitary_certificate', 'other'
);
CREATE TYPE linked_entity_type AS ENUM ('farmer', 'batch', 'shipment');
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    document_type document_type NOT NULL,
    linked_to_type linked_entity_type NOT NULL,
    linked_to_id VARCHAR(64) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255),
    content_type VARCHAR(128),
    size_bytes INTEGER,
    expiry_date DATE,
    extracted_fields JSONB,
    extraction_confidence FLOAT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_documents_organization_id ON documents(organization_id);
CREATE INDEX ix_documents_linked_to_id ON documents(linked_to_id);

CREATE TYPE finding_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE finding_status AS ENUM ('open', 'resolved', 'waived');

CREATE TABLE compliance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    readiness_score INTEGER NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_compliance_assessments_shipment_id ON compliance_assessments(shipment_id);

CREATE TABLE compliance_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES compliance_assessments(id),
    rule_id VARCHAR(128) NOT NULL,
    severity finding_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    remediation TEXT NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    status finding_status NOT NULL DEFAULT 'open',
    reviewer_user_id VARCHAR(64),
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX ix_compliance_findings_assessment_id ON compliance_findings(assessment_id);
CREATE INDEX ix_compliance_findings_rule_id ON compliance_findings(rule_id);
CREATE TABLE farm_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    farm_id UUID NOT NULL REFERENCES farms(id),
    job_id VARCHAR(64),
    provider VARCHAR(32) NOT NULL,
    commodity VARCHAR(64) NOT NULL DEFAULT 'cocoa',
    risk VARCHAR(32) NOT NULL,
    indicators JSONB,
    details JSONB,
    polygon_hash VARCHAR(64) NOT NULL,
    screened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_farm_screenings_farm_id ON farm_screenings(farm_id);
CREATE INDEX ix_farm_screenings_organization_id ON farm_screenings(organization_id);
CREATE INDEX ix_farm_screenings_job_id ON farm_screenings(job_id);

CREATE TABLE screening_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    requested_by VARCHAR(64),
    provider VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    farm_ids JSONB,
    farm_count INTEGER NOT NULL DEFAULT 0,
    done_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX ix_screening_jobs_organization_id ON screening_jobs(organization_id);
