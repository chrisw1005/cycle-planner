-- Store user-specified vial count for E3D drugs (e.g. HCG: user enters how many vials needed)
ALTER TABLE cycle_drugs ADD COLUMN vial_count INTEGER;
