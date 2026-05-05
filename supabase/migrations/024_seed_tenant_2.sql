-- ==================== Seed Tenant 2 ====================
-- Creates a second tenant and seeds it with:
--   - All drugs from tenant 1 (image_url preserved, inventory_count zeroed)
--   - One specific person and their full cycle history (cycles + cycle_drugs +
--     cycle_cells + cycle_supplies)
--
-- Tenant 1 is read-only here: only INSERTs, no UPDATE/DELETE on existing rows.
-- The whole DO block runs in a single transaction; any failure leaves no half-state.

DO $$
DECLARE
  t1_id UUID := (SELECT id FROM tenants WHERE slug = 'default');
  t2_id UUID;
  src_person_id UUID := 'fc1ea67b-0e62-40de-a982-31f255494d41';
  new_person_id UUID := gen_random_uuid();
BEGIN
  IF t1_id IS NULL THEN
    RAISE EXCEPTION 'default tenant missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM people WHERE id = src_person_id) THEN
    RAISE EXCEPTION 'source person % not found — abort seed', src_person_id;
  END IF;

  -- 1) Create tenant 2
  INSERT INTO tenants (slug, name, primary_domain)
  VALUES ('tenant2', 'Tenant 2', NULL)
  RETURNING id INTO t2_id;

  -- 2) drugs: pre-generate new ids → mapping table → bulk insert
  CREATE TEMP TABLE drug_id_map ON COMMIT DROP AS
  SELECT id AS old_id, gen_random_uuid() AS new_id
  FROM drugs WHERE tenant_id = t1_id;

  INSERT INTO drugs (
    id, tenant_id, template_id, name, concentration,
    primary_category, sub_category, ester_type, unit, brand,
    image_url, inventory_count, tabs_per_box
  )
  SELECT
    m.new_id, t2_id, d.template_id, d.name, d.concentration,
    d.primary_category, d.sub_category, d.ester_type, d.unit, d.brand,
    d.image_url, 0, d.tabs_per_box
  FROM drugs d
  JOIN drug_id_map m ON m.old_id = d.id
  WHERE d.tenant_id = t1_id;

  -- 3) people: clone the specified person into tenant 2
  INSERT INTO people (
    id, tenant_id, nickname, height, weight, body_fat, age,
    needs_cycle, cycle_goal_notes, notes
  )
  SELECT
    new_person_id, t2_id, nickname, height, weight, body_fat, age,
    needs_cycle, cycle_goal_notes, notes
  FROM people
  WHERE id = src_person_id;

  -- 4) cycles for that person
  CREATE TEMP TABLE cycle_id_map ON COMMIT DROP AS
  SELECT id AS old_id, gen_random_uuid() AS new_id
  FROM cycles WHERE person_id = src_person_id;

  INSERT INTO cycles (
    id, tenant_id, person_id, name, total_weeks, status, start_date, notes
  )
  SELECT
    m.new_id, t2_id, new_person_id, c.name, c.total_weeks, c.status, c.start_date, c.notes
  FROM cycles c
  JOIN cycle_id_map m ON m.old_id = c.id;

  -- 5) cycle_drugs: cycle_id and drug_id both remap
  CREATE TEMP TABLE cycle_drug_id_map ON COMMIT DROP AS
  SELECT cd.id AS old_id, gen_random_uuid() AS new_id
  FROM cycle_drugs cd
  JOIN cycle_id_map cm ON cm.old_id = cd.cycle_id;

  INSERT INTO cycle_drugs (
    id, tenant_id, cycle_id, drug_id, weekly_dose, daily_dose,
    injection_ml, total_injections, vial_count, schedule_mode,
    start_week, end_week
  )
  SELECT
    cdm.new_id, t2_id, cm.new_id, dm.new_id, cd.weekly_dose, cd.daily_dose,
    cd.injection_ml, cd.total_injections, cd.vial_count, cd.schedule_mode,
    cd.start_week, cd.end_week
  FROM cycle_drugs cd
  JOIN cycle_drug_id_map cdm ON cdm.old_id = cd.id
  JOIN cycle_id_map cm ON cm.old_id = cd.cycle_id
  JOIN drug_id_map dm ON dm.old_id = cd.drug_id;

  -- 6) cycle_cells: cycle_id and cycle_drug_id both remap
  INSERT INTO cycle_cells (
    id, tenant_id, cycle_id, cycle_drug_id, week_number, day_of_week,
    display_value, ml_amount, is_manual_override, is_skipped
  )
  SELECT
    gen_random_uuid(), t2_id, cm.new_id, cdm.new_id, cc.week_number, cc.day_of_week,
    cc.display_value, cc.ml_amount, cc.is_manual_override, cc.is_skipped
  FROM cycle_cells cc
  JOIN cycle_id_map cm ON cm.old_id = cc.cycle_id
  JOIN cycle_drug_id_map cdm ON cdm.old_id = cc.cycle_drug_id;

  -- 7) cycle_supplies: supply_id stays (supplies is a global table)
  INSERT INTO cycle_supplies (
    id, tenant_id, cycle_id, supply_id, override_quantity
  )
  SELECT
    gen_random_uuid(), t2_id, cm.new_id, cs.supply_id, cs.override_quantity
  FROM cycle_supplies cs
  JOIN cycle_id_map cm ON cm.old_id = cs.cycle_id;
END $$;
