-- Custom dosing frequency: custom_days stores weekdays 1=Mon..7=Sun (repeated weekly), interval_days stores every-N-days from start
-- Both modes store the per-administration dose in daily_dose (mg); applies to non-E3D injectables and oral/PCT
-- RLS unchanged (anon FOR ALL already covers new columns)
ALTER TABLE cycle_drugs ADD COLUMN custom_days INTEGER[];
ALTER TABLE cycle_drugs ADD COLUMN interval_days INTEGER;
ALTER TABLE cycle_template_drugs ADD COLUMN custom_days INTEGER[];
ALTER TABLE cycle_template_drugs ADD COLUMN interval_days INTEGER;
