-- Needle/syringe supplies must count steroid injections only. HCG (ester_type 'E3D')
-- is injected with an insulin needle, so 23G/24G needles and syringes should not be
-- multiplied by HCG injection events. injection_basis 'steroid' = exclude E3D from the
-- per_injection count; 'all' = every injection (default, e.g. alcohol wipes).
-- RLS unchanged (anon FOR ALL already covers the new column).
ALTER TABLE supplies ADD COLUMN injection_basis TEXT NOT NULL DEFAULT 'all'
  CHECK (injection_basis IN ('all', 'steroid'));

-- Matches both the original seed names (e.g. '24G 針頭', '2.5cc 針筒') and the
-- tenant-edited names (e.g. '24G 針頭+針筒', '19G 針頭', '23G 針頭+針筒').
UPDATE supplies SET injection_basis = 'steroid'
  WHERE name LIKE '%針頭%' OR name LIKE '%針筒%';
