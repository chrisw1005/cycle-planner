'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CycleTemplate, CycleFormData } from '@/types'
import { toast } from 'sonner'

const supabase = createClient()

export function useTemplates() {
  return useQuery<CycleTemplate[]>({
    queryKey: ['cycle-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_templates')
        .select(`
          *,
          drugs:cycle_template_drugs(
            *,
            drug:drugs(id, name, concentration, primary_category, ester_type, unit)
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveAsTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      description,
      total_weeks,
      drugs,
    }: {
      name: string
      description?: string | null
      total_weeks: number
      drugs: {
        drug_id: string
        weekly_dose?: number | null
        daily_dose?: number | null
        injection_ml?: number | null
        total_injections?: number | null
        schedule_mode?: string | null
        start_week: number
        end_week: number
      }[]
    }) => {
      const { data: template, error: templateError } = await supabase
        .from('cycle_templates')
        .insert({ name, description: description ?? null, total_weeks })
        .select()
        .single()
      if (templateError) throw templateError

      if (drugs.length > 0) {
        const templateDrugs = drugs.map((d) => ({
          template_id: template.id,
          drug_id: d.drug_id,
          weekly_dose: d.weekly_dose ?? null,
          daily_dose: d.daily_dose ?? null,
          injection_ml: d.injection_ml ?? null,
          total_injections: d.total_injections ?? null,
          schedule_mode: d.schedule_mode ?? null,
          start_week: d.start_week,
          end_week: d.end_week,
        }))
        const { error: drugsError } = await supabase.from('cycle_template_drugs').insert(templateDrugs)
        if (drugsError) throw drugsError
      }

      return template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-templates'], refetchType: 'all' })
      toast.success('模板已儲存')
    },
    onError: (error) => toast.error('儲存模板失敗', { description: error.message }),
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string | null; total_weeks?: number }) => {
      const { data, error } = await supabase.from('cycle_templates').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-templates'], refetchType: 'all' })
      toast.success('模板已更新')
    },
    onError: (error) => toast.error('更新失敗', { description: error.message }),
  })
}

export function useRemoveTemplateDrug() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cycle_template_drugs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-templates'], refetchType: 'all' })
    },
    onError: (error) => toast.error('移除失敗', { description: error.message }),
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cycle_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-templates'], refetchType: 'all' })
      toast.success('模板已刪除')
    },
    onError: (error) => toast.error('刪除失敗', { description: error.message }),
  })
}

export function useCreateCycleFromTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      cycle,
      templateId,
    }: {
      cycle: Omit<CycleFormData, 'created_at' | 'updated_at'>
      templateId: string
    }) => {
      const { data: newCycle, error: cycleError } = await supabase
        .from('cycles')
        .insert(cycle)
        .select()
        .single()
      if (cycleError) throw cycleError

      const { data: templateDrugs, error: drugsError } = await supabase
        .from('cycle_template_drugs')
        .select('*')
        .eq('template_id', templateId)
      if (drugsError) throw drugsError

      if (templateDrugs && templateDrugs.length > 0) {
        const cycleDrugs = templateDrugs.map(({ id: _id, template_id: _tid, created_at: _ca, ...rest }) => ({
          ...rest,
          cycle_id: newCycle.id,
        }))
        const { error: insertError } = await supabase.from('cycle_drugs').insert(cycleDrugs)
        if (insertError) throw insertError
      }

      return newCycle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['people'], refetchType: 'all' })
      toast.success('課表已從模板建立')
    },
    onError: (error) => toast.error('建立失敗', { description: error.message }),
  })
}
