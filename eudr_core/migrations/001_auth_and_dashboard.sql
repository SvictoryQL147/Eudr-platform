-- Run this ONCE on a database created from the original schema.sql
-- (pgAdmin -> eudr_core -> Query Tool -> paste -> F5). Safe to re-run.
-- Fresh installs don't need it: schema.sql already includes these columns.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS community VARCHAR(255);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state VARCHAR(128);

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS reference VARCHAR(64);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS commodity VARCHAR(64) NOT NULL DEFAULT 'cocoa';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS hs_code VARCHAR(16) NOT NULL DEFAULT '1801';

ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type VARCHAR(128);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS size_bytes INTEGER;

CREATE INDEX IF NOT EXISTS ix_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS ix_shipments_organization_id ON shipments(organization_id);
CREATE INDEX IF NOT EXISTS ix_farmers_organization_id ON farmers(organization_id);
CREATE INDEX IF NOT EXISTS ix_documents_organization_id ON documents(organization_id);
