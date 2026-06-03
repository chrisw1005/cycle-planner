'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateInventoryDeltas } from '@/lib/calculations/vial-calculator'
import { useDrugs } from './use-drugs'
import { useTenant } from '@/hooks/use-tenant'
import type { DrugInventoryDelta } from '@/types'

const supabase = createClient()

/**
 * Aggregate inventory deficits across all active (non-Testing, non-Archived) cycles
 * for the current tenant only.
 */
export function useGlobalInventoryDeficits() {
  const { tenantId } = useTenant()
  const { data: allDrugs } = useDrugs()

  return useQuery<DrugInventoryDelta[]>({
    queryKey: ['global-inventory-deficits', tenantId],
    enabled: !!allDrugs && !!tenantId,
    queryFn: async () => {
      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id, status,
          cycle_drugs(
            *,
            drug:drugs(id, name, concentration, primary_category, sub_category, ester_type, inventory_count, tabs_per_box, package_unit, template_id)
          )
        `)
        .eq('tenant_id', tenantId!)
        .not('status', 'in', '("Testing","Archived")')

      if (error) throw error
      if (!cycles) return []

      const allCycleDrugs = cycles.flatMap((c: any) => c.cycle_drugs || [])
      if (allCycleDrugs.length === 0) return []

      return calculateInventoryDeltas(allCycleDrugs as any, allDrugs as any)
    },
  })
}
