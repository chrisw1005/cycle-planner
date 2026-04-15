'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCreateCycle } from '@/hooks/use-cycles'
import { usePeople } from '@/hooks/use-people'
import { useTemplates, useDeleteTemplate, useCreateCycleFromTemplate } from '@/hooks/use-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronUp, X, Pill } from 'lucide-react'
import { getDoseUnit } from '@/lib/utils'
import type { CycleTemplate, CycleTemplateDrug } from '@/types'

const formatDrugDose = (td: CycleTemplateDrug) => {
  if (td.injection_ml) return `${td.injection_ml}ml x ${td.total_injections}`
  if (td.weekly_dose) return `${td.weekly_dose}${getDoseUnit(td.drug?.unit)}/wk`
  return `${td.daily_dose}${getDoseUnit(td.drug?.unit)}/day`
}

function NewCycleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPersonId = searchParams.get('personId') || ''
  const { data: people } = usePeople()
  const { data: templates } = useTemplates()
  const createCycle = useCreateCycle()
  const deleteTemplate = useDeleteTemplate()
  const createFromTemplate = useCreateCycleFromTemplate()

  const [personId, setPersonId] = useState(preselectedPersonId)
  const [name, setName] = useState('')
  const [totalWeeks, setTotalWeeks] = useState('12')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [notesInitialized, setNotesInitialized] = useState(false)

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templatesExpanded, setTemplatesExpanded] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<CycleTemplate | null>(null)

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId) || null

  // Auto-fill notes from person's cycle_goal_notes when preselected
  useEffect(() => {
    if (!notesInitialized && preselectedPersonId && people) {
      const person = people.find(p => p.id === preselectedPersonId)
      if (person?.cycle_goal_notes) {
        setNotes(person.cycle_goal_notes)
      }
      setNotesInitialized(true)
    }
  }, [preselectedPersonId, people, notesInitialized])

  const handleTemplateSelect = (template: CycleTemplate) => {
    if (selectedTemplateId === template.id) {
      // Deselect
      setSelectedTemplateId(null)
      setTotalWeeks('12')
      setName('')
    } else {
      setSelectedTemplateId(template.id)
      setTotalWeeks(String(template.total_weeks))
      setName(template.name)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, template: CycleTemplate) => {
    e.stopPropagation()
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!templateToDelete) return
    deleteTemplate.mutate(templateToDelete.id, {
      onSuccess: () => {
        if (selectedTemplateId === templateToDelete.id) {
          setSelectedTemplateId(null)
          setTotalWeeks('12')
          setName('')
        }
        setDeleteDialogOpen(false)
        setTemplateToDelete(null)
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cycleData = {
      person_id: personId,
      name: name || null,
      total_weeks: parseInt(totalWeeks),
      status: 'Planned' as const,
      start_date: startDate || null,
      notes: notes || null,
    }

    if (selectedTemplateId) {
      createFromTemplate.mutate(
        { cycle: cycleData, templateId: selectedTemplateId },
        { onSuccess: (data) => router.push(`/cycles/${data.id}`) }
      )
    } else {
      createCycle.mutate(cycleData, {
        onSuccess: (data) => router.push(`/cycles/${data.id}`),
      })
    }
  }

  const isPending = createCycle.isPending || createFromTemplate.isPending

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Template Selector */}
      {templates && templates.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setTemplatesExpanded(v => !v)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">從模板建立</CardTitle>
              {templatesExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {templatesExpanded && (
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => {
                  const isSelected = selectedTemplateId === template.id
                  return (
                    <div
                      key={template.id}
                      className={`group relative cursor-pointer rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-foreground/30'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      {/* Delete button */}
                      <button
                        type="button"
                        className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => handleDeleteClick(e, template)}
                        aria-label="刪除模板"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      <div className="pr-5">
                        <p className="font-medium text-sm leading-tight">{template.name}</p>
                        {template.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {template.total_weeks} 週
                          </Badge>
                          {template.drugs && template.drugs.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Pill className="h-3 w-3" />
                              {template.drugs.length} 種藥物
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedTemplate ? `從「${selectedTemplate.name}」建立課表` : '新建課表'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>人員 *</Label>
              <Select value={personId} onValueChange={(v: string | null) => v && setPersonId(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="選擇人員...">
                    {(value: string | null) => {
                      if (!value) return null
                      return people?.find(p => p.id === value)?.nickname ?? value
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {people?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">課表名稱</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：增肌期 Cycle 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weeks">總週數</Label>
                <Input
                  id="weeks"
                  type="number"
                  min="1"
                  max="52"
                  value={totalWeeks}
                  onChange={(e) => setTotalWeeks(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日期</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  {startDate && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => setStartDate('')}
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="課表備註 / 目標..."
                rows={3}
              />
            </div>

            {/* Drug preview when template selected */}
            {selectedTemplate && selectedTemplate.drugs && selectedTemplate.drugs.length > 0 && (
              <div className="space-y-2">
                <Label>模板藥物（建立後自動加入）</Label>
                <div className="rounded-md border divide-y text-sm">
                  {selectedTemplate.drugs.map((td) => (
                    <div key={td.id} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium">
                        {td.drug ? td.drug.name : <span className="text-muted-foreground">（已刪除）</span>}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span>{formatDrugDose(td)}</span>
                        <span>W{td.start_week}–{td.end_week}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!personId || isPending}>
              {isPending
                ? '建立中...'
                : selectedTemplateId
                  ? '從模板建立課表'
                  : '建立課表'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>刪除模板</DialogTitle>
            <DialogDescription>
              確定要刪除模板「{templateToDelete?.name}」？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? '刪除中...' : '刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NewCyclePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>}>
      <NewCycleForm />
    </Suspense>
  )
}
