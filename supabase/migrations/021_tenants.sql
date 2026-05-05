-- ==================== Tenants ====================
-- Multi-tenant root table: each tenant is one logical "user" of the system,
-- typically associated with a primary domain.

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  primary_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_primary_domain ON tenants(primary_domain);

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (matching existing pattern: anon has full CRUD, auth enforced at app level)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_tenants_all" ON tenants FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed default tenant for backfilling existing data.
-- primary_domain is left NULL here; configure via /dev/dashboard once deployed.
INSERT INTO tenants (slug, name, primary_domain)
VALUES ('default', 'Tenant 1', NULL);
