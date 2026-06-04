-- Money fields (NTD, whole integers, thousands-separated in UI).
-- sale_price: per-cycle total selling price (manually entered).
-- cost_price: per-drug purchase cost. Neither feeds any calculation yet.
-- RLS unchanged (anon FOR ALL already covers new columns).
ALTER TABLE cycles ADD COLUMN sale_price INTEGER;
ALTER TABLE drugs ADD COLUMN cost_price INTEGER;
