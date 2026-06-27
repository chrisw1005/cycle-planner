'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  useExportNote,
  useSaveExportNote,
  useExportNoteTemplates,
  useSaveExportNoteTemplate,
  useDeleteExportNoteTemplate,
} from '@/hooks/use-export-notes'
import { NoteEditor, type NoteEditorHandle } from './note-editor'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { BookmarkPlus, Trash2, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

export interface ExportNoteSectionHandle {
  getHTML: () => string
  isEmpty: () => boolean
}

interface Props {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
}

export const ExportNoteSection = forwardRef<ExportNoteSectionHandle, Props>(function ExportNoteSection(
  { enabled, onEnabledChange },
  ref
) {
  const { data: note, isLoading } = useExportNote()
  const saveNote = useSaveExportNote()
  const { data: templates } = useExportNoteTemplates()
  const saveTemplate = useSaveExportNoteTemplate()
  const deleteTemplate = useDeleteExportNoteTemplate()

  const editorRef = useRef<NoteEditorHandle>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ dirty: boolean; content: unknown }>({ dirty: false, content: null })
  const saveNoteRef = useRef(saveNote)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    saveNoteRef.current = saveNote
  })

  // Flush a still-pending debounced save when the section unmounts (e.g. the
  // export dialog is closed within the 800ms window) so the last edit persists.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (pendingRef.current.dirty) saveNoteRef.current.mutate(pendingRef.current.content)
    },
    []
  )

  useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editorRef.current?.getHTML() ?? '',
      isEmpty: () => editorRef.current?.isEmpty() ?? true,
    }),
    []
  )

  const handleChange = (json: unknown) => {
    pendingRef.current = { dirty: true, content: json }
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveNote.mutate(json, {
        onSuccess: () => {
          pendingRef.current.dirty = false
          setSaveState('saved')
        },
        onError: (e) => {
          setSaveState('idle')
          toast.error('備註儲存失敗', { description: e instanceof Error ? e.message : undefined })
        },
      })
    }, 800)
  }

  const handleSaveTemplate = () => {
    if (editorRef.current?.isEmpty() ?? true) {
      toast.error('備註是空的，無法另存為範本')
      return
    }
    const name = window.prompt('範本名稱：')?.trim()
    if (!name) return
    const content = editorRef.current?.getJSON() ?? {}
    saveTemplate.mutate(
      { name, content },
      {
        onSuccess: () => toast.success(`已儲存範本「${name}」`),
        onError: (e) => toast.error('範本儲存失敗', { description: e instanceof Error ? e.message : undefined }),
      }
    )
  }

  const handleLoadTemplate = (content: unknown, name: string) => {
    editorRef.current?.setContent(content)
    toast.success(`已載入範本「${name}」`)
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 p-3 border-b">
        <Switch checked={enabled} onCheckedChange={onEnabledChange} size="sm" />
        <span className="text-sm font-medium">包含備註</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {saveState === 'saving' && (<><Loader2 className="h-3 w-3 animate-spin" /> 儲存中…</>)}
          {saveState === 'saved' && (<><Check className="h-3 w-3" /> 已儲存</>)}
        </span>
      </div>

      <div className="space-y-2 p-3">
        {isLoading ? (
          <div className="h-[180px] rounded-md border bg-muted/30 animate-pulse" />
        ) : (
          <NoteEditor ref={editorRef} initialContent={note?.content} onChange={handleChange} />
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveTemplate}>
            <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
            另存為範本
          </Button>
          {(templates ?? []).map((t) => (
            <span key={t.id} className="flex items-center gap-0.5 rounded-md border bg-muted/40 pl-2 text-xs">
              <button
                type="button"
                className="py-1 hover:underline"
                title={`載入範本「${t.name}」`}
                onClick={() => handleLoadTemplate(t.content, t.name ?? '')}
              >
                {t.name}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`刪除範本「${t.name}」`}
                title={`刪除範本「${t.name}」`}
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (window.confirm(`確定刪除範本「${t.name}」嗎？`)) deleteTemplate.mutate(t.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>
        {enabled && (
          <p className="text-xs text-muted-foreground">匯出 PDF 時，備註會接在藥物需求量表格之後。</p>
        )}
      </div>
    </div>
  )
})
