-- ==================== Export notes ====================
-- Rich-text note appended to the bottom of a cycle's PDF export.
--   * name IS NULL  -> the single ACTIVE note for a tenant (shared by every
--                      cycle's export, auto-saved as the user types).
--   * name NOT NULL -> a saved, reusable template (a named snapshot the user
--                      can load back into the active note).
-- Tenant-scoped (templates/notes are NOT shared across tenants). `content`
-- holds the Tiptap document JSON.

CREATE TABLE export_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one active note (name IS NULL) per tenant.
CREATE UNIQUE INDEX uniq_export_notes_active ON export_notes (tenant_id) WHERE name IS NULL;
CREATE INDEX idx_export_notes_tenant ON export_notes (tenant_id, name);

-- RLS (matching existing pattern: anon has full CRUD, auth enforced at app level)
ALTER TABLE export_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_export_notes_all" ON export_notes FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TRIGGER update_export_notes_updated_at
  BEFORE UPDATE ON export_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
