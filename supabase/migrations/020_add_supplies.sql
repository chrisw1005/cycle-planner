-- Supplies: reusable equipment library (needles, syringes, alcohol wipes, ...)
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('per_injection', 'per_day', 'per_week', 'fixed')),
  rule_value DECIMAL NOT NULL DEFAULT 1,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-cycle selection + manual quantity override
CREATE TABLE cycle_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  override_quantity DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, supply_id)
);

-- RLS (matching existing pattern: anon has full CRUD, auth enforced at app level)
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_supplies_all" ON supplies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_cycle_supplies_all" ON cycle_supplies FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX idx_supplies_display_order ON supplies(display_order, name);
CREATE INDEX idx_cycle_supplies_cycle_id ON cycle_supplies(cycle_id);

-- Pre-seeded common supplies (8 items)
INSERT INTO supplies (name, unit, rule_type, rule_value, is_system, display_order) VALUES
  ('24G 針頭',   '支', 'per_injection', 1, TRUE, 10),
  ('23G 針頭',   '支', 'per_injection', 1, TRUE, 20),
  ('2.5cc 針筒', '支', 'per_injection', 1, TRUE, 30),
  ('5cc 針筒',   '支', 'per_injection', 1, TRUE, 40),
  ('酒精棉片',   '片', 'per_injection', 1, TRUE, 50),
  ('OK 繃',      '片', 'per_injection', 1, TRUE, 60),
  ('注射用水',   'ml', 'fixed',          5, TRUE, 70),
  ('醫療手套',   '副', 'per_injection', 1, TRUE, 80);
