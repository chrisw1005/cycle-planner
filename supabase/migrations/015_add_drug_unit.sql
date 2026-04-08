-- Add unit field to drugs (e.g. mg/ml, mg/tab, mcg/tab, IU/vial)
ALTER TABLE drugs ADD COLUMN unit TEXT NOT NULL DEFAULT 'mg/ml';
