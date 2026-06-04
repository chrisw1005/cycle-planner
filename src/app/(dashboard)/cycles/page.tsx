'use client'

import { useState, useEffect } from 'react'
import { useCycles, useDeleteCycle } from '@/hooks/use-cycles'
import { useAuth } from '@/hooks/use-auth'
import { useTemplates, useDeleteTemplate, useUpdateTemplate, useRemoveTemplateDrug, useAddTemplateDrug } from '@/hooks/use-templates'
import { useDrugs } from '@/hooks/use-drugs'
import { CycleExportDialog } from '@/components/cycles/cycle-export-dialog'
import { CycleStatusSelect } from '@/components/cycles/cycle-status-select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Eye, Pencil, Trash2, ChevronDown, ChevronUp, BookmarkPlus, Pill, X } from 'lucide-react'
import Link from 'next/link'
import { statusColors, statusLabels } from '@/lib/constants/cycle-status'
import { getDoseUnit } from '@/lib/utils'
import type { CycleStatus } from '@/types'
import type { CycleTemplate, CycleTemplateDrug } from '@/types'

export default function CyclesPage() {
  const { data: cycles, isLoading } = useCycles()
  const deleteCycle = useDeleteCycle()
  const { isAdmin } = useAuth()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  // Template state
  const [templatesExpanded, setTemplatesExpanded] = useState(true)
  const [editTemplate, setEditTemplate] = useState<CycleTemplate | null>(null)
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<CycleTemplate | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Add-drug form state
  const [addDrugId, setAddDrugId] = useState('')
  const [addDrugDose, setAddDrugDose] = useState('')
  const [addDrugScheduleMode, setAddDrugScheduleMode] = useState('')
  const [addDrugStartWeek, setAddDrugStartWeek] = useState('1')
  const [addDrugEndWeek, setAddDrugEndWeek] = useState('12')

  // Template hooks
  const { data: templates } = useTemplates()
  const deleteTemplateMut = useDeleteTemplate()
  const updateTemplate = useUpdateTemplate()
  const removeTemplateDrug = useRemoveTemplateDrug()
  const addTemplateDrug = useAddTemplateDrug()
  const { data: allDrugs } = useDrugs()

  // Sync edit form when editTemplate changes
  useEffect(() => {
    if (editTemplate) {
      setEditName(editTemplate.name)
      setEditDesc(editTemplate.description || '')
      setAddDrugId('')
      setAddDrugDose('')
      setAddDrugScheduleMode('')
      setAddDrugStartWeek('1')
      setAddDrugEndWeek(String(editTemplate.total_weeks))
    }
  }, [editTemplate])

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">課表管理</h1>
        {isAdmin && (
          <Button render={<Link href="/cycles/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              新建課表
          </Button>
        )}
      </div>

      {/* Templates Section */}
      {templates && templates.length > 0 && (
        <div className="rounded-md border">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
            onClick={() => setTemplatesExpanded(v => !v)}
          >
            <span className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" />
              課表模板 ({templates.length})
            </span>
            {templatesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${templatesExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="border-t px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="group relative rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{tpl.name}</p>
                        {tpl.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{tpl.total_weeks} 週</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Pill className="h-3 w-3" />
                            {tpl.drugs?.length || 0} 種藥物
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="編輯模板"
                          onClick={() => { setEditTemplate(tpl); setEditName(tpl.name); setEditDesc(tpl.description || '') }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="刪除模板"
                          onClick={() => setDeleteTemplateTarget(tpl)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {!cycles?.length ? (
        <p className="text-muted-foreground py-12 text-center">尚無課表</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>人員</TableHead>
                <TableHead>名稱</TableHead>
                <TableHead>週數</TableHead>
                <TableHead>開始日期</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="w-28 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id} className={cycle.status === 'Archived' ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{(cycle as any).person?.nickname}</TableCell>
                  <TableCell>{cycle.name || '—'}</TableCell>
                  <TableCell>{cycle.total_weeks} 週</TableCell>
                  <TableCell>
                    {cycle.start_date ? new Date(cycle.start_date).toLocaleDateString('zh-TW') : '—'}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <CycleStatusSelect cycle={cycle} allDrugs={allDrugs ?? []} />
                    ) : (
                      <Badge variant="outline" className={statusColors[cycle.status]}>
                        {statusLabels[cycle.status]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="檢視" onClick={() => setPreviewId(cycle.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="編輯" render={<Link href={`/cycles/${cycle.id}`} />}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (cycle.status === 'Scheduled' || cycle.status === 'Planned') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="刪除" onClick={() => setDeleteTarget(cycle.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>此操作會刪除課表及所有排程資料，確定嗎？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { deleteTarget && deleteCycle.mutate(deleteTarget); setDeleteTarget(null) }}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cycle Preview/Export Modal */}
      {previewId && (
        <CycleExportDialog id={previewId} open={!!previewId} onOpenChange={(open) => !open && setPreviewId(null)} />
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名稱</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">說明</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="模板說明..." />
            </div>
            {editTemplate?.drugs && editTemplate.drugs.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">包含藥物</label>
                <div className="rounded-md border divide-y text-sm">
                  {editTemplate.drugs.map((td) => (
                    <div key={td.id} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium">{td.drug?.name || '(已刪除)'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {td.injection_ml ? `${td.injection_ml}ml x ${td.total_injections}` : td.weekly_dose ? `${td.weekly_dose}${getDoseUnit(td.drug?.unit)}/wk` : `${td.daily_dose}${getDoseUnit(td.drug?.unit)}/day`}
                          {' '}W{td.start_week}–{td.end_week}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" aria-label="移除藥物"
                          onClick={() => removeTemplateDrug.mutate(td.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Add Drug to Template */}
            <div className="space-y-2">
              <label className="text-sm font-medium">新增藥物</label>
              <div className="space-y-2 rounded-md border p-3">
                <Select value={addDrugId} onValueChange={(v: string | null) => v && setAddDrugId(v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="選擇藥物...">
                      {(value: string | null) => {
                        if (!value) return null
                        return allDrugs?.find((d) => d.id === value)?.name ?? value
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allDrugs?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.concentration}{d.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const selectedDrug = allDrugs?.find(d => d.id === addDrugId)
                  const isInjectable = selectedDrug?.primary_category === 'Injectable'
                  const isOral = selectedDrug && (selectedDrug.primary_category === 'Oral' || selectedDrug.primary_category === 'PCT' || selectedDrug.primary_category === 'Other')
                  return (
                    <>
                      {/* Schedule mode selector — for both injectable and oral */}
                      {addDrugId && (
                        <Select value={addDrugScheduleMode} onValueChange={(v: string | null) => setAddDrugScheduleMode(v || '')}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="施打方式...">
                              {(value: string | null) => {
                                if (!value) return null
                                const labels: Record<string, string> = {
                                  'twice_weekly': '一週兩次 (Day1 & Day4)',
                                  'eod': '隔日 (EOD)',
                                  'daily': '每日',
                                  'split_weekly': '每週固定天 (Day1 & Day4)',
                                }
                                return labels[value] ?? value
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {isInjectable ? (
                              <>
                                <SelectItem value="twice_weekly">一週兩次 (Day1 & Day4)</SelectItem>
                                <SelectItem value="eod">隔日 (EOD)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="daily">每日</SelectItem>
                                <SelectItem value="eod">隔日 (EOD)</SelectItem>
                                <SelectItem value="split_weekly">每週固定天 (Day1 & Day4)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">{isOral ? '劑量 (mg/day)' : '劑量 (mg/wk)'}</Label>
                          <Input type="number" step="any" value={addDrugDose} onChange={(e) => setAddDrugDose(e.target.value)} placeholder="mg" className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">起始週</Label>
                          <Input type="number" min="1" value={addDrugStartWeek} onChange={(e) => setAddDrugStartWeek(e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">結束週</Label>
                          <Input type="number" min="1" value={addDrugEndWeek} onChange={(e) => setAddDrugEndWeek(e.target.value)} className="text-sm" />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full"
                        disabled={!addDrugId || !addDrugDose || !editTemplate || addTemplateDrug.isPending}
                        onClick={() => {
                          if (!editTemplate || !addDrugId) return
                          addTemplateDrug.mutate({
                            template_id: editTemplate.id,
                            drug_id: addDrugId,
                            weekly_dose: isOral ? null : parseFloat(addDrugDose) || null,
                            daily_dose: isOral ? parseFloat(addDrugDose) || null : null,
                            schedule_mode: addDrugScheduleMode || null,
                            start_week: parseInt(addDrugStartWeek) || 1,
                            end_week: parseInt(addDrugEndWeek) || editTemplate.total_weeks,
                          }, {
                            onSuccess: () => {
                              setAddDrugId('')
                              setAddDrugDose('')
                              setAddDrugScheduleMode('')
                              setAddDrugStartWeek('1')
                              setAddDrugEndWeek(String(editTemplate?.total_weeks || 12))
                            }
                          })
                        }}
                      >
                        {addTemplateDrug.isPending ? '新增中...' : '新增藥物'}
                      </Button>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>取消</Button>
            <Button
              disabled={!editName.trim() || updateTemplate.isPending}
              onClick={() => {
                if (!editTemplate) return
                updateTemplate.mutate(
                  { id: editTemplate.id, name: editName.trim(), description: editDesc.trim() || null },
                  { onSuccess: () => setEditTemplate(null) }
                )
              }}
            >
              {updateTemplate.isPending ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <Dialog open={!!deleteTemplateTarget} onOpenChange={(open) => !open && setDeleteTemplateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除模板</DialogTitle>
            <DialogDescription>確定要刪除模板「{deleteTemplateTarget?.name}」？此操作無法復原。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplateTarget(null)}>取消</Button>
            <Button variant="destructive" disabled={deleteTemplateMut.isPending}
              onClick={() => {
                if (!deleteTemplateTarget) return
                deleteTemplateMut.mutate(deleteTemplateTarget.id, { onSuccess: () => setDeleteTemplateTarget(null) })
              }}>
              {deleteTemplateMut.isPending ? '刪除中...' : '刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
