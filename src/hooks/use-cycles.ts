'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/hooks/use-tenant'
import type { Cycle, CycleFormData, CycleDrug, CycleCell, CycleStatus } from '@/types'
import { toast } from 'sonner'

const supabase = createClient()

export function useCycles() {
  const { tenantId } = useTenant()
  return useQuery<Cycle[]>({
    queryKey: ['cycles', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*, person:people(id, nickname)')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCycle(id: string) {
  const { tenantId } = useTenant()
  return useQuery<Cycle & { cycle_drugs: (CycleDrug & { drug: any })[] }>({
    queryKey: ['cycles', tenantId, id],
    enabled: !!id && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select(`
          *,
          person:people(id, nickname),
          cycle_drugs(
            *,
            drug:drugs(id, name, concentration, primary_category, sub_category, ester_type, inventory_count, tabs_per_box, template_id)
          )
        `)
        .eq('tenant_id', tenantId!)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCycleCells(cycleId: string) {
  const { tenantId } = useTenant()
  return useQuery<CycleCell[]>({
    queryKey: ['cycle-cells', tenantId, cycleId],
    enabled: !!cycleId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_cells')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('cycle_id', cycleId)
        .order('week_number')
        .order('day_of_week')
      if (error) throw error
      return data
    },
  })
}

export function useCreateCycle() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async (cycle: Omit<CycleFormData, 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { data, error } = await supabase.from('cycles').insert({ ...cycle, tenant_id: tenantId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['people'], refetchType: 'all' })
      toast.success('課表已建立')
    },
    onError: (error) => toast.error('建立失敗', { description: error.message }),
  })
}

export function useUpdateCycle() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ id, ...cycle }: Partial<Cycle> & { id: string }) => {
      const { tenant_id: _drop, ...rest } = cycle as any
      const { data, error } = await supabase.from('cycles').update(rest).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['cycles', tenantId, newData.id] })
      const previousCycle = queryClient.getQueryData(['cycles', tenantId, newData.id])

      queryClient.setQueryData(['cycles', tenantId, newData.id], (old: any) => {
        if (!old) return old
        return { ...old, ...newData }
      })

      return { previousCycle }
    },
    onError: (error, newData, context) => {
      if (context?.previousCycle) {
        queryClient.setQueryData(['cycles', tenantId, newData.id], context.previousCycle)
      }
      toast.error('更新失敗', { description: error.message })
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['cycles', tenantId, variables.id], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['people'], refetchType: 'all' })
    },
    onSuccess: () => {
      toast.success('課表已更新')
    },
  })
}

export function useUpdateCycleStatus() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CycleStatus }) => {
      const { data, error } = await supabase.from('cycles').update({ status }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['cycles', tenantId, data.id], refetchType: 'all' })
      toast.success('狀態已更新')
    },
    onError: (error) => toast.error('更新失敗', { description: error.message }),
  })
}

export function useAddCycleDrug() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async (cycleDrug: { cycle_id: string; drug_id: string; weekly_dose?: number; daily_dose?: number; injection_ml?: number; total_injections?: number; vial_count?: number; schedule_mode?: string; custom_days?: number[]; interval_days?: number; start_week: number; end_week: number }) => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { data, error } = await supabase.from('cycle_drugs').insert({ ...cycleDrug, tenant_id: tenantId }).select('*, drug:drugs(*)').single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycles', tenantId, data.cycle_id] })
      queryClient.invalidateQueries({ queryKey: ['cycle-cells', tenantId, data.cycle_id] })
    },
    onError: (error) => toast.error('新增失敗', { description: error.message }),
  })
}

export function useUpdateCycleDrug() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ id, cycle_id, ...updates }: { id: string; cycle_id: string; start_week?: number; end_week?: number }) => {
      const { data, error } = await supabase.from('cycle_drugs').update(updates).eq('id', id).select('*, drug:drugs(*)').single()
      if (error) throw error
      return { ...data, cycle_id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycles', tenantId, data.cycle_id] })
      queryClient.invalidateQueries({ queryKey: ['cycle-cells', tenantId, data.cycle_id] })
    },
    onError: (error) => toast.error('更新失敗', { description: error.message }),
  })
}

export function useRemoveCycleDrug() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ id, cycle_id }: { id: string; cycle_id: string }) => {
      const { error } = await supabase.from('cycle_drugs').delete().eq('id', id)
      if (error) throw error
      return { cycle_id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycles', tenantId, data.cycle_id] })
      queryClient.invalidateQueries({ queryKey: ['cycle-cells', tenantId, data.cycle_id] })
      toast.success('藥物已移除')
    },
    onError: (error) => toast.error('移除失敗', { description: error.message }),
  })
}

export function useSaveCycleCells() {
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ cycle_id, cells }: { cycle_id: string; cells: Omit<CycleCell, 'id' | 'tenant_id' | 'created_at'>[] }) => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { error: deleteError } = await supabase.from('cycle_cells').delete().eq('cycle_id', cycle_id)
      if (deleteError) throw deleteError
      if (cells.length > 0) {
        const cellsWithTenant = cells.map((c) => ({ ...c, tenant_id: tenantId }))
        const { error: insertError } = await supabase.from('cycle_cells').insert(cellsWithTenant)
        if (insertError) throw insertError
      }
      return { cycle_id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-cells', tenantId, data.cycle_id] })
      toast.success('課表已儲存')
    },
    onError: (error) => toast.error('儲存失敗', { description: error.message }),
  })
}

export function useDeleteCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cycles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['people'], refetchType: 'all' })
      toast.success('課表已刪除')
    },
    onError: (error) => toast.error('刪除失敗', { description: error.message }),
  })
}
