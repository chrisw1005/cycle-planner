-- Inventory ledger: records every stock movement (restock / shipment / adjustment).
-- `inventory_count` on drugs stays the canonical on-hand balance; every ledger row
-- moves it by `delta`. Shipment rows are linked to the cycle that consumed the stock.
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,                                            -- + restock, - shipment
  kind TEXT NOT NULL CHECK (kind IN ('shipment', 'restock', 'adjustment')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_tx_tenant_created ON inventory_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_inv_tx_cycle ON inventory_transactions(cycle_id);

-- RLS (matching existing pattern: anon has full CRUD, auth enforced at app level)
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_inventory_transactions_all" ON inventory_transactions FOR ALL TO anon USING (true) WITH CHECK (true);

-- Mark a cycle as shipped: deduct stock + write shipment ledger rows, then set status.
-- Idempotent: if shipment rows already exist for this cycle, only ensure the status.
-- p_items: jsonb array of { drug_id: uuid, units: int }
CREATE OR REPLACE FUNCTION complete_cycle_shipment(
  p_cycle_id uuid,
  p_tenant_id uuid,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM inventory_transactions
    WHERE cycle_id = p_cycle_id AND kind = 'shipment'
  ) THEN
    UPDATE cycles SET status = 'Completed' WHERE id = p_cycle_id;
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE drugs
      SET inventory_count = inventory_count - (item->>'units')::int
      WHERE id = (item->>'drug_id')::uuid;

    INSERT INTO inventory_transactions (tenant_id, drug_id, cycle_id, delta, kind)
      VALUES (
        p_tenant_id,
        (item->>'drug_id')::uuid,
        p_cycle_id,
        -((item->>'units')::int),
        'shipment'
      );
  END LOOP;

  UPDATE cycles SET status = 'Completed' WHERE id = p_cycle_id;
END;
$$;

-- Reverse a cycle's shipment: add the deducted stock back (from the ledger snapshot,
-- not a recomputation), remove the shipment rows, then set the new status.
CREATE OR REPLACE FUNCTION revert_cycle_shipment(
  p_cycle_id uuid,
  p_new_status text
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tx record;
BEGIN
  FOR tx IN
    SELECT drug_id, delta FROM inventory_transactions
    WHERE cycle_id = p_cycle_id AND kind = 'shipment'
  LOOP
    -- delta is negative (it was a deduction); subtracting it adds the stock back
    UPDATE drugs
      SET inventory_count = inventory_count - tx.delta
      WHERE id = tx.drug_id;
  END LOOP;

  DELETE FROM inventory_transactions
    WHERE cycle_id = p_cycle_id AND kind = 'shipment';

  UPDATE cycles SET status = p_new_status WHERE id = p_cycle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_cycle_shipment(uuid, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION revert_cycle_shipment(uuid, text) TO anon, authenticated;
