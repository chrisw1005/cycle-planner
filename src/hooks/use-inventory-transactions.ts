'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/hooks/use-tenant'
import type { InventoryTransaction } from '@/types'

const supabase = createClient()

/**
 * Recent inventory ledger movements (restock / shipment / adjustment) for the
 * current tenant, newest first.
 */
export function useInventoryTransactions(limit = 30) {
  const { tenantId } = useTenant()
  return useQuery<InventoryTransaction[]>({
    queryKey: ['inventory-transactions', tenantId, limit],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, drug:drugs(name), cycle:cycles(name, person:people(nickname))')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as InventoryTransaction[]
    },
  })
}
