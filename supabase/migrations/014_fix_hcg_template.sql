-- Fix HCG template: should be Injectable + E3D, not PCT
UPDATE drug_templates
SET primary_category = 'Injectable',
    ester_type = 'E3D'
WHERE short_name = 'HCG';
