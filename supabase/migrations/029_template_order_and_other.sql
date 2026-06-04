-- Drug ordering for the cycle export (PDF/XLSX):
--   1. Add a 4th primary category 'Other' for auxiliary drugs (e.g. isotretinoin)
--      so they group after Injectable/Oral/PCT instead of polluting those buckets.
--   2. Add a per-template display_order; the export sorts drugs by
--      primary_category -> sub_category -> template.display_order -> name.
-- RLS unchanged (anon FOR ALL already covers the new column).

ALTER TABLE drug_templates DROP CONSTRAINT drug_templates_primary_category_check;
ALTER TABLE drug_templates ADD CONSTRAINT drug_templates_primary_category_check
  CHECK (primary_category IN ('Injectable', 'Oral', 'PCT', 'Other'));

ALTER TABLE drugs DROP CONSTRAINT drugs_primary_category_check;
ALTER TABLE drugs ADD CONSTRAINT drugs_primary_category_check
  CHECK (primary_category IN ('Injectable', 'Oral', 'PCT', 'Other'));

ALTER TABLE drug_templates ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Backfill display_order, restarting at 1 within each (primary_category, sub_category).
-- User-specified order for Test (E,P,C,Sust,U) and Nor-19 (Deca,NPP,TrenE,TrenA);
-- every other sub-category keeps the current export order (short_name ascending).
UPDATE drug_templates SET display_order = CASE short_name
  -- Injectable / Test
  WHEN 'TestE' THEN 1 WHEN 'TestP' THEN 2 WHEN 'TestC' THEN 3 WHEN 'Sust' THEN 4 WHEN 'TestU' THEN 5
  -- Injectable / Nor-19
  WHEN 'Deca' THEN 1 WHEN 'NPP' THEN 2 WHEN 'TrenE' THEN 3 WHEN 'TrenA' THEN 4
  -- Injectable / DHT
  WHEN 'EQ' THEN 1 WHEN 'MastE' THEN 2 WHEN 'MastP' THEN 3 WHEN 'PrimoE' THEN 4 WHEN 'Winstrol (inj)' THEN 5
  -- Injectable / Other
  WHEN 'HCG' THEN 1
  -- Oral / Test
  WHEN 'Dbol' THEN 1 WHEN 'Halotestin' THEN 2 WHEN 'Tbol' THEN 3
  -- Oral / DHT
  WHEN 'Anadrol' THEN 1 WHEN 'Anavar' THEN 2 WHEN 'M1T' THEN 3 WHEN 'Proviron' THEN 4 WHEN 'Superdrol' THEN 5 WHEN 'Winstrol' THEN 6
  -- Oral / Other
  WHEN 'Clen' THEN 1 WHEN 'T3' THEN 2 WHEN 'T4' THEN 3
  -- PCT / AI
  WHEN 'Anastrozole' THEN 1 WHEN 'Exemestane' THEN 2 WHEN 'Letrozole' THEN 3
  -- PCT / SERM
  WHEN 'Clomid' THEN 1 WHEN 'Fareston' THEN 2 WHEN 'Nolvadex' THEN 3
  -- PCT / Prolactin
  WHEN 'Dostinex' THEN 1 WHEN 'Mirapex' THEN 2
  ELSE 0
END;

-- Reclassify clearly auxiliary drugs into the new 'Other' category (tenant data).
-- Cabaser (cabergoline) is intentionally left as-is; the user can recategorise it
-- via the drug form now that 'Other' is selectable.
UPDATE drugs SET primary_category = 'Other' WHERE name = 'isotretinoin';
