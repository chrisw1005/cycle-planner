'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Supply, SupplyRuleType } from '@/types'

const supabase = createClient()

export function useSupplies() {
  return useQuery<Supply[]>({
    queryKey: ['supplies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplies')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export interface SupplyInput {
  name: string
  unit: string
  rule_type: SupplyRuleType
  rule_value: number
  display_order?: number
}

export function useCreateSupply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SupplyInput): Promise<Supply> => {
      const { data, error } = await supabase
        .from('supplies')
        .insert({ ...input, is_system: false })
        .select()
        .single()
      if (error) throw error
      return data as Supply
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplies'], refetchType: 'all' }),
  })
}

export function useUpdateSupply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: SupplyInput & { id: string }): Promise<Supply> => {
      const { data, error } = await supabase
        .from('supplies')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Supply
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplies'], refetchType: 'all' }),
  })
}

export function useDeleteSupply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplies'], refetchType: 'all' }),
  })
}
