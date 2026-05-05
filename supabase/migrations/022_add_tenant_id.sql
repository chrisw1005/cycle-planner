-- ==================== Add tenant_id to all per-tenant tables ====================
-- Tables NOT scoped by tenant (intentionally global):
--   tenants, drug_templates, supplies, profiles, webauthn_credentials
--
-- Backfill strategy: every existing row goes to the 'default' tenant
-- (created in migration 021), then NOT NULL is enforced.

DO $$
DECLARE
  default_tenant_id UUID := (SELECT id FROM tenants WHERE slug = 'default');
BEGIN
  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'default tenant missing — run 021_tenants.sql first';
  END IF;

  -- accounts
  ALTER TABLE accounts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE accounts SET tenant_id = default_tenant_id;
  ALTER TABLE accounts ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);

  -- people
  ALTER TABLE people ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE people SET tenant_id = default_tenant_id;
  ALTER TABLE people ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_people_tenant_id ON people(tenant_id);

  -- drugs
  ALTER TABLE drugs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE drugs SET tenant_id = default_tenant_id;
  ALTER TABLE drugs ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_drugs_tenant_id ON drugs(tenant_id);

  -- cycles
  ALTER TABLE cycles ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycles SET tenant_id = default_tenant_id;
  ALTER TABLE cycles ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycles_tenant_id ON cycles(tenant_id);

  -- cycle_drugs
  ALTER TABLE cycle_drugs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycle_drugs SET tenant_id = default_tenant_id;
  ALTER TABLE cycle_drugs ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycle_drugs_tenant_id ON cycle_drugs(tenant_id);

  -- cycle_cells
  ALTER TABLE cycle_cells ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycle_cells SET tenant_id = default_tenant_id;
  ALTER TABLE cycle_cells ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycle_cells_tenant_id ON cycle_cells(tenant_id);

  -- cycle_templates
  ALTER TABLE cycle_templates ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycle_templates SET tenant_id = default_tenant_id;
  ALTER TABLE cycle_templates ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycle_templates_tenant_id ON cycle_templates(tenant_id);

  -- cycle_template_drugs
  ALTER TABLE cycle_template_drugs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycle_template_drugs SET tenant_id = default_tenant_id;
  ALTER TABLE cycle_template_drugs ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycle_template_drugs_tenant_id ON cycle_template_drugs(tenant_id);

  -- cycle_supplies
  ALTER TABLE cycle_supplies ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  UPDATE cycle_supplies SET tenant_id = default_tenant_id;
  ALTER TABLE cycle_supplies ALTER COLUMN tenant_id SET NOT NULL;
  CREATE INDEX idx_cycle_supplies_tenant_id ON cycle_supplies(tenant_id);
END $$;
