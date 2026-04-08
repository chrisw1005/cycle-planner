-- Add schedule_mode to cycle_drugs for flexible dosing patterns
-- Values: null/'daily' = every day, 'eod' = every other day, 'split_weekly' = Day 1 & Day 4
ALTER TABLE cycle_drugs ADD COLUMN schedule_mode TEXT;
