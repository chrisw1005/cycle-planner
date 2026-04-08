-- Add E3D ester type to HCG template (stays PCT/Other category)
UPDATE drug_templates
SET ester_type = 'E3D'
WHERE short_name = 'HCG';
