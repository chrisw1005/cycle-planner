-- E3D (every-3-day) injectables like HCG use injection count instead of weekly dose
ALTER TABLE cycle_drugs ADD COLUMN injection_ml DECIMAL;
ALTER TABLE cycle_drugs ADD COLUMN total_injections INTEGER;
