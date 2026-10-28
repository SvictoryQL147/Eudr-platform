-- Run ONCE after 001 (pgAdmin -> eudr_core -> Query Tool -> File > Open -> F5).
-- Safe to re-run. Fresh installs don't need it: schema.sql includes these tables.

CREATE TABLE IF NOT EXISTS farm_screenings (
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
CREATE INDEX IF NOT EXISTS ix_farm_screenings_farm_id ON farm_screenings(farm_id);
CREATE INDEX IF NOT EXISTS ix_farm_screenings_organization_id ON farm_screenings(organization_id);
CREATE INDEX IF NOT EXISTS ix_farm_screenings_job_id ON farm_screenings(job_id);

CREATE TABLE IF NOT EXISTS screening_jobs (
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
CREATE INDEX IF NOT EXISTS ix_screening_jobs_organization_id ON screening_jobs(organization_id);
