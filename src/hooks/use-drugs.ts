'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/hooks/use-tenant'
import type { Drug, DrugTemplate, DrugFormData } from '@/types'
import { toast } from 'sonner'

const supabase = createClient()

export function useDrugTemplates() {
  return useQuery<DrugTemplate[]>({
    queryKey: ['drug-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drug_templates')
        .select('*')
        .order('primary_category')
        .order('sub_category')
        .order('short_name')
      if (error) throw error
      return data
    },
  })
}

export function useBrandSuggestions() {
  const { tenantId } = useTenant()
  return useQuery<string[]>({
    queryKey: ['brand-suggestions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('brand')
        .eq('tenant_id', tenantId!)
        .not('brand', 'is', null)
        .order('brand')
      if (error) throw error
      return [...new Set(data?.map(d => d.brand).filter(Boolean))] as string[]
    },
  })
}

export function useDrugs() {
  const { tenantId } = useTenant()
  return useQuery<Drug[]>({
    queryKey: ['drugs', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('*, template:drug_templates(*)')
        .eq('tenant_id', tenantId!)
        .order('primary_category')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useDrug(id: string) {
  const { tenantId } = useTenant()
  return useQuery<Drug>({
    queryKey: ['drugs', tenantId, id],
    enabled: !!id && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('*, template:drug_templates(*)')
        .eq('tenant_id', tenantId!)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateDrug() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()

  return useMutation({
    mutationFn: async (drug: Omit<DrugFormData, 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { data, error } = await supabase
        .from('drugs')
        .insert({ ...drug, tenant_id: tenantId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      toast.success('藥品已新增')
    },
    onError: (error) => {
      toast.error('新增失敗', { description: error.message })
    },
  })
}

export function useUpdateDrug() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...drug }: Partial<Drug> & { id: string }) => {
      const { tenant_id: _drop, ...rest } = drug as any
      const { data, error } = await supabase
        .from('drugs')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      queryClient.invalidateQueries({ queryKey: ['drugs', data.tenant_id, data.id] })
      toast.success('藥品已更新')
    },
    onError: (error) => {
      toast.error('更新失敗', { description: error.message })
    },
  })
}

export function useDeleteDrug() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drugs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      toast.success('藥品已刪除')
    },
    onError: (error) => {
      toast.error('刪除失敗', { description: error.message })
    },
  })
}

export interface BatchInventoryUpdate {
  id: string
  inventory_count: number
}

export function useBatchUpdateDrugInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: BatchInventoryUpdate[]) => {
      if (updates.length === 0) return []
      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from('drugs')
            .update({ inventory_count: u.inventory_count })
            .eq('id', u.id)
            .select('id, inventory_count')
            .single(),
        ),
      )
      const failed = results.filter((r) => r.error)
      if (failed.length > 0) {
        throw new Error(`${failed.length} 筆更新失敗：${failed[0].error?.message}`)
      }
      return results.map((r) => r.data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      queryClient.invalidateQueries({ queryKey: ['global-inventory-deficits'] })
      toast.success(`已更新 ${data.length} 項庫存`)
    },
    onError: (error) => {
      toast.error('批次更新失敗', { description: error.message })
    },
  })
}
