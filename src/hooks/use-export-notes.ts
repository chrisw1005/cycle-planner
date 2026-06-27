'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/hooks/use-tenant'
import type { ExportNote } from '@/types'

const supabase = createClient()

/**
 * The tenant's single ACTIVE note (name IS NULL) — shared across every cycle's
 * export and auto-saved as the user types. Returns null when none exists yet.
 */
export function useExportNote() {
  const { tenantId } = useTenant()
  return useQuery<ExportNote | null>({
    queryKey: ['export-note', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('name', null)
        .maybeSingle()
      if (error) throw error
      return (data as ExportNote) ?? null
    },
  })
}

/**
 * Upsert the active note's content. Implemented as update-then-insert so it
 * respects the partial unique index on (tenant_id) WHERE name IS NULL (which a
 * plain .upsert() onConflict can't target). Used for debounced auto-save, so it
 * keeps the cache fresh via setQueryData rather than invalidating (which would
 * refetch and fight the editor).
 */
export function useSaveExportNote() {
  const qc = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async (content: unknown): Promise<ExportNote> => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { data: updated, error: updErr } = await supabase
        .from('export_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .is('name', null)
        .select()
        .maybeSingle()
      if (updErr) throw updErr
      if (updated) return updated as ExportNote
      const { data: inserted, error: insErr } = await supabase
        .from('export_notes')
        .insert({ tenant_id: tenantId, name: null, content })
        .select()
        .single()
      if (!insErr) return inserted as ExportNote
      // Lost a first-creation race: another concurrent save inserted the active
      // row first (unique_violation on uniq_export_notes_active). The row now
      // exists, so update it instead so this (latest) edit still wins.
      if ((insErr as { code?: string }).code !== '23505') throw insErr
      const { data: retried, error: retryErr } = await supabase
        .from('export_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .is('name', null)
        .select()
        .single()
      if (retryErr) throw retryErr
      return retried as ExportNote
    },
    onSuccess: (row) => {
      qc.setQueryData(['export-note', tenantId], row)
    },
  })
}

/** Saved, reusable templates (name IS NOT NULL), newest first. */
export function useExportNoteTemplates() {
  const { tenantId } = useTenant()
  return useQuery<ExportNote[]>({
    queryKey: ['export-note-templates', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('name', 'is', null)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data as ExportNote[]) ?? []
    },
  })
}

export function useSaveExportNoteTemplate() {
  const qc = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async ({ name, content }: { name: string; content: unknown }): Promise<ExportNote> => {
      if (!tenantId) throw new Error('Tenant not resolved')
      const { data, error } = await supabase
        .from('export_notes')
        .insert({ tenant_id: tenantId, name, content })
        .select()
        .single()
      if (error) throw error
      return data as ExportNote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['export-note-templates', tenantId] }),
  })
}

export function useDeleteExportNoteTemplate() {
  const qc = useQueryClient()
  const { tenantId } = useTenant()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['export-note-templates', tenantId] }),
  })
}
