'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CycleSupply } from '@/types'

const supabase = createClient()

export function useCycleSupplies(cycleId: string | undefined) {
  return useQuery<CycleSupply[]>({
    queryKey: ['cycle-supplies', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_supplies')
        .select('*')
        .eq('cycle_id', cycleId!)
      if (error) throw error
      return data ?? []
    },
  })
}

export interface UpsertCycleSupplyInput {
  cycle_id: string
  supply_id: string
  override_quantity?: number | null
}

export function useUpsertCycleSupply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertCycleSupplyInput): Promise<CycleSupply> => {
      const { data, error } = await supabase
        .from('cycle_supplies')
        .upsert(
          {
            cycle_id: input.cycle_id,
            supply_id: input.supply_id,
            override_quantity: input.override_quantity ?? null,
          },
          { onConflict: 'cycle_id,supply_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as CycleSupply
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['cycle-supplies', vars.cycle_id], refetchType: 'all' }),
  })
}

export function useDeleteCycleSupply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { cycle_id: string; supply_id: string }) => {
      const { error } = await supabase
        .from('cycle_supplies')
        .delete()
        .eq('cycle_id', input.cycle_id)
        .eq('supply_id', input.supply_id)
      if (error) throw error
      return input
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['cycle-supplies', vars.cycle_id], refetchType: 'all' }),
  })
}
