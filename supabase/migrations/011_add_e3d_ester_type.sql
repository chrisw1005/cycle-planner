-- Allow E3D ester type for HCG-style every-3-day injectables
ALTER TABLE drugs DROP CONSTRAINT IF EXISTS drugs_ester_type_check;
ALTER TABLE drugs ADD CONSTRAINT drugs_ester_type_check
  CHECK (ester_type IN ('Long', 'Short', 'E3D'));

ALTER TABLE drug_templates DROP CONSTRAINT IF EXISTS drug_templates_ester_type_check;
ALTER TABLE drug_templates ADD CONSTRAINT drug_templates_ester_type_check
  CHECK (ester_type IN ('Long', 'Short', 'E3D'));
