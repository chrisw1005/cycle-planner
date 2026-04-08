'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateInventoryDeltas } from '@/lib/calculations/vial-calculator'
import { useDrugs } from './use-drugs'
import type { DrugInventoryDelta } from '@/types'

const supabase = createClient()

/**
 * Aggregate inventory deficits across all active (non-Testing, non-Archived) cycles.
 * Returns drugs where total demand across all cycles exceeds current inventory.
 */
export function useGlobalInventoryDeficits() {
  const { data: allDrugs } = useDrugs()

  return useQuery<DrugInventoryDelta[]>({
    queryKey: ['global-inventory-deficits'],
    queryFn: async () => {
      // Fetch all active cycles with their drugs
      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id, status,
          cycle_drugs(
            *,
            drug:drugs(id, name, concentration, primary_category, sub_category, ester_type, inventory_count, tabs_per_box, template_id)
          )
        `)
        .not('status', 'in', '("Testing","Archived")')

      if (error) throw error
      if (!cycles) return []

      // Collect all cycle_drugs from all active cycles
      const allCycleDrugs = cycles.flatMap((c: any) => c.cycle_drugs || [])
      if (allCycleDrugs.length === 0) return []

      // Calculate aggregated deltas
      return calculateInventoryDeltas(allCycleDrugs as any, allDrugs as any)
    },
    enabled: !!allDrugs,
  })
}
