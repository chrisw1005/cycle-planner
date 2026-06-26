'use client'

import { use, useState, useMemo, useCallback } from 'react'
import { useCycle, useCycleCells, useAddCycleDrug, useRemoveCycleDrug, useUpdateCycleDrug, useSaveCycleCells, useUpdateCycle, useUpdateCycleStatus, useCompleteCycleShipment, useRevertCycleShipment, useDeleteCycle } from '@/hooks/use-cycles'
import { useDrugs } from '@/hooks/use-drugs'
import { useAuth } from '@/hooks/use-auth'
import { ScheduleGrid } from '@/components/cycles/schedule-grid'
import { DrugSelector } from '@/components/cycles/drug-selector'
import { CalculationSummary } from '@/components/cycles/calculation-summary'
import { CycleExportDialog } from '@/components/cycles/cycle-export-dialog'
import { SaveTemplateDialog } from '@/components/cycles/save-template-dialog'
import { EditCycleDrugDialog } from '@/components/cycles/edit-cycle-drug-dialog'
import { generateAllCells } from '@/lib/calculations/schedule-engine'
import { calculateInventoryDeltas, adjustDeltasForSkippedCells } from '@/lib/calculations/vial-calculator'
import { getDoseUnit, cn, formatThousands } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Minus, Save, ArrowLeft, Download, Trash2, MoreHorizontal, Archive, BookmarkPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { statusColors, statusLabels } from '@/lib/constants/cycle-status'
import type { CycleStatus, CycleCell } from '@/types'
import type { OverlapReplaceOps } from '@/components/cycles/drug-selector'
import type { EditableCycleDrug, CycleDrugUpdate } from '@/components/cycles/edit-cycle-drug-dialog'
import type { CellMoveData } from '@/components/cycles/schedule-grid'

export default function CycleBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cycle, isLoading } = useCycle(id)
  const { data: savedCells } = useCycleCells(id)
  const addCycleDrug = useAddCycleDrug()
  const removeCycleDrug = useRemoveCycleDrug()
  const updateCycleDrug = useUpdateCycleDrug()
  const saveCells = useSaveCycleCells()
  const updateCycle = useUpdateCycle()
  const updateStatus = useUpdateCycleStatus()
  const completeCycle = useCompleteCycleShipment()
  const revertCycle = useRevertCycleShipment()
  const { data: allDrugs } = useDrugs()
  const { isAdmin } = useAuth()

  const router = useRouter()
  const deleteCycle = useDeleteCycle()
  const [drugSelectorOpen, setDrugSelectorOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [weekChangeDialogOpen, setWeekChangeDialogOpen] = useState(false)
  const [pendingWeekDelta, setPendingWeekDelta] = useState(0)
  const [editingCycleDrug, setEditingCycleDrug] = useState<EditableCycleDrug | null>(null)
  const [localOverrides, setLocalOverrides] = useState<Map<string, { value: string; ml: number | null }>>(new Map())
  const [localSkips, setLocalSkips] = useState<Set<string> | null>(null)
  const [localNotes, setLocalNotes] = useState<string | null>(null)
  const [localName, setLocalName] = useState<string | null>(null)
  const [localSalePrice, setLocalSalePrice] = useState<string | null>(null)
  const [localMoves, setLocalMoves] = useState<CellMoveData[]>([])

  // Initialize skip state from saved cells (once on load)
  // Separate drag-moved skips from regular skips
  const { savedSkipSet, savedMovesList } = useMemo(() => {
    const set = new Set<string>()
    const moves: CellMoveData[] = []
    if (savedCells) {
      // Find moved pairs: skipped+manual_override source → manual_override target (same cycle_drug_id)
      const skippedManual = savedCells.filter((c) => c.is_skipped && c.is_manual_override)
      const movedTargets = savedCells.filter((c) => !c.is_skipped && c.is_manual_override)

      const pairedSourceKeys = new Set<string>()
      for (const source of skippedManual) {
        const target = movedTargets.find((t) => t.cycle_drug_id === source.cycle_drug_id)
        if (target) {
          moves.push({
            cycleDrugId: source.cycle_drug_id,
            fromWeek: source.week_number,
            fromDay: source.day_of_week,
            toWeek: target.week_number,
            toDay: target.day_of_week,
          })
          pairedSourceKeys.add(`${source.cycle_drug_id}-${source.week_number}-${source.day_of_week}`)
        }
      }

      for (const c of savedCells) {
        if (c.is_skipped && !pairedSourceKeys.has(`${c.cycle_drug_id}-${c.week_number}-${c.day_of_week}`)) {
          set.add(`${c.cycle_drug_id}-${c.week_number}-${c.day_of_week}`)
        }
      }
    }
    return { savedSkipSet: set, savedMovesList: moves }
  }, [savedCells])

  // Initialize localMoves from saved moves on first load
  const [movesInitialized, setMovesInitialized] = useState(false)
  if (!movesInitialized && savedMovesList.length > 0) {
    setLocalMoves(savedMovesList)
    setMovesInitialized(true)
  }

  // Use saved skips until user makes local changes
  const activeSkips = localSkips ?? savedSkipSet

  // Generate cells from cycle drugs
  // Exclude move-related saved cells so generatedCells stays clean;
  // all move logic is handled by localMoves + displayCells
  const generatedCells = useMemo(() => {
    if (!cycle?.cycle_drugs) return []

    // Build set of move-related cell keys to exclude from overrides
    const moveRelatedKeys = new Set<string>()
    for (const move of savedMovesList) {
      moveRelatedKeys.add(`${move.cycleDrugId}-${move.fromWeek}-${move.fromDay}`)
      moveRelatedKeys.add(`${move.cycleDrugId}-${move.toWeek}-${move.toDay}`)
    }

    const overrides = savedCells?.filter((c) => {
      if (!c.is_manual_override && !c.is_skipped) return false
      const key = `${c.cycle_drug_id}-${c.week_number}-${c.day_of_week}`
      return !moveRelatedKeys.has(key)
    }) || []

    return generateAllCells(cycle.cycle_drugs as any, cycle.total_weeks, overrides)
  }, [cycle, savedCells, savedMovesList])

  // Convert generated cells to CycleCell-like objects for the grid
  // Moved sources are excluded from display (invisible, not strikethrough)
  // Moved targets replace any existing cell at that position
  const displayCells: CycleCell[] = useMemo(() => {
    // Build lookup sets for move sources and targets
    const movedSourceKeys = new Set<string>()
    const movedTargetKeys = new Set<string>()
    const movedTargets: CycleCell[] = []

    for (const move of localMoves) {
      movedSourceKeys.add(`${move.cycleDrugId}-${move.fromWeek}-${move.fromDay}`)
      const targetKey = `${move.cycleDrugId}-${move.toWeek}-${move.toDay}`
      movedTargetKeys.add(targetKey)

      const sourceCell = generatedCells.find(
        (c) => c.cycle_drug_id === move.cycleDrugId && c.week_number === move.fromWeek && c.day_of_week === move.fromDay
      )
      if (sourceCell) {
        movedTargets.push({
          id: `moved-${move.cycleDrugId}-${move.toWeek}-${move.toDay}`,
          tenant_id: cycle?.tenant_id ?? '',
          cycle_id: id,
          cycle_drug_id: sourceCell.cycle_drug_id,
          week_number: move.toWeek,
          day_of_week: move.toDay,
          display_value: sourceCell.display_value,
          ml_amount: sourceCell.ml_amount,
          is_manual_override: true,
          is_skipped: false,
          created_at: '',
        })
      }
    }

    // Build base cells: exclude moved sources, exclude cells replaced by moved targets
    const baseCells: CycleCell[] = []
    generatedCells.forEach((cell, i) => {
      const cellKey = `${cell.cycle_drug_id}-${cell.week_number}-${cell.day_of_week}`
      // Skip moved-away source cells (they disappear)
      if (movedSourceKeys.has(cellKey)) return
      // Skip cells at target position that will be replaced by moved cell
      if (movedTargetKeys.has(cellKey)) return

      const key = `${cell.week_number}-${cell.day_of_week}`
      const override = localOverrides.get(`${key}-${cell.cycle_drug_id}`)
      const skipKey = cellKey
      baseCells.push({
        id: `gen-${i}`,
        tenant_id: cycle?.tenant_id ?? '',
        cycle_id: id,
        cycle_drug_id: cell.cycle_drug_id,
        week_number: cell.week_number,
        day_of_week: cell.day_of_week,
        display_value: override?.value || cell.display_value,
        ml_amount: override?.ml ?? cell.ml_amount,
        is_manual_override: cell.is_manual_override || !!override,
        is_skipped: activeSkips.has(skipKey),
        created_at: '',
      })
    })

    return [...baseCells, ...movedTargets]
  }, [generatedCells, localOverrides, activeSkips, localMoves, id])

  // Inventory deltas (adjusted for skipped cells) — computed for every status so the
  // summary + the completion deduction always have the per-drug needs available.
  const inventoryDeltas = useMemo(() => {
    if (!cycle?.cycle_drugs) return []
    const base = calculateInventoryDeltas(cycle.cycle_drugs as any, allDrugs as any)
    return adjustDeltasForSkippedCells(base, displayCells, cycle.cycle_drugs as any)
  }, [cycle, allDrugs, displayCells])

  // Shortage highlight only applies to in-progress (排制中) cycles. Completed cycles
  // have already shipped (stock deducted); Testing/Archived don't drive purchasing.
  const showDeficits = cycle?.status === 'Scheduled' || cycle?.status === 'Planned'
  const inventoryDeficitsMap = useMemo(() => {
    const map = new Map<string, number>()
    if (showDeficits) {
      inventoryDeltas.forEach((d) => map.set(d.drug_id, d.deficit))
    }
    return map
  }, [inventoryDeltas, showDeficits])

  // Handlers
  const handleAddDrug = useCallback((data: { drug_id: string; weekly_dose?: number; daily_dose?: number; injection_ml?: number; total_injections?: number; schedule_mode?: string; custom_days?: number[]; interval_days?: number; start_week: number; end_week: number }) => {
    // Auto-expand total weeks if drug end_week exceeds current cycle length
    if (cycle && data.end_week > cycle.total_weeks) {
      updateCycle.mutate({ id, total_weeks: data.end_week })
    }
    addCycleDrug.mutate({
      cycle_id: id,
      ...data,
      weekly_dose: data.weekly_dose || undefined,
      daily_dose: data.daily_dose || undefined,
      injection_ml: data.injection_ml || undefined,
      total_injections: data.total_injections || undefined,
      schedule_mode: data.schedule_mode || undefined,
      custom_days: data.custom_days || undefined,
      interval_days: data.interval_days || undefined,
    })
  }, [id, addCycleDrug, cycle, updateCycle])

  const handleUpdateCycleDrug = useCallback((updates: CycleDrugUpdate) => {
    // Auto-expand total weeks if the new end_week exceeds current cycle length
    if (cycle && updates.end_week > cycle.total_weeks) {
      updateCycle.mutate({ id, total_weeks: updates.end_week })
    }
    updateCycleDrug.mutate({ cycle_id: id, ...updates })
  }, [id, updateCycleDrug, cycle, updateCycle])

  const handleReplaceDrug = useCallback(async (ops: OverlapReplaceOps) => {
    // Remove fully covered entries
    for (const removeId of ops.toRemove) {
      await removeCycleDrug.mutateAsync({ id: removeId, cycle_id: id })
    }
    // Trim partially overlapping entries
    for (const update of ops.toUpdate) {
      await updateCycleDrug.mutateAsync({ id: update.id, cycle_id: id, start_week: update.start_week, end_week: update.end_week })
    }
    // Create split tail entries
    for (const create of ops.toCreate) {
      await addCycleDrug.mutateAsync({ cycle_id: id, ...create })
    }
    // Add the new drug
    const data = ops.newData
    if (cycle && data.end_week > cycle.total_weeks) {
      updateCycle.mutate({ id, total_weeks: data.end_week })
    }
    addCycleDrug.mutate({
      cycle_id: id,
      ...data,
      weekly_dose: data.weekly_dose || undefined,
      daily_dose: data.daily_dose || undefined,
      injection_ml: data.injection_ml || undefined,
      total_injections: data.total_injections || undefined,
      schedule_mode: data.schedule_mode || undefined,
      custom_days: data.custom_days || undefined,
      interval_days: data.interval_days || undefined,
    })
  }, [id, removeCycleDrug, updateCycleDrug, addCycleDrug, cycle, updateCycle])

  const handleSave = useCallback(() => {
    // Save visible cells from displayCells
    const cellsToSave = displayCells.map((c) => ({
      cycle_id: id,
      cycle_drug_id: c.cycle_drug_id,
      week_number: c.week_number,
      day_of_week: c.day_of_week,
      display_value: c.display_value,
      ml_amount: c.ml_amount,
      is_manual_override: c.is_manual_override,
      is_skipped: c.is_skipped,
    }))
    // Also save moved-away source cells as is_skipped for persistence
    for (const move of localMoves) {
      const sourceCell = generatedCells.find(
        (c) => c.cycle_drug_id === move.cycleDrugId && c.week_number === move.fromWeek && c.day_of_week === move.fromDay
      )
      if (sourceCell) {
        cellsToSave.push({
          cycle_id: id,
          cycle_drug_id: sourceCell.cycle_drug_id,
          week_number: sourceCell.week_number,
          day_of_week: sourceCell.day_of_week,
          display_value: sourceCell.display_value,
          ml_amount: sourceCell.ml_amount,
          is_manual_override: true,
          is_skipped: true,
        })
      }
    }
    saveCells.mutate({ cycle_id: id, cells: cellsToSave })
  }, [displayCells, localMoves, generatedCells, id, saveCells])

  const handleSkipToggle = useCallback((cycleDrugId: string, weekNumber: number, dayOfWeek: number) => {
    const skipKey = `${cycleDrugId}-${weekNumber}-${dayOfWeek}`
    setLocalSkips((prev) => {
      const next = new Set(prev ?? savedSkipSet)
      if (next.has(skipKey)) {
        next.delete(skipKey)
      } else {
        next.add(skipKey)
      }
      return next
    })
  }, [savedSkipSet])

  const handleCellMove = useCallback((moves: CellMoveData[]) => {
    setLocalMoves((prev) => {
      const next = [...prev]
      for (const move of moves) {
        // Check if dragging from the original source position
        let existingIdx = next.findIndex(
          (m) => m.cycleDrugId === move.cycleDrugId && m.fromWeek === move.fromWeek && m.fromDay === move.fromDay
        )
        // Or dragging from a previously moved-to position (re-drag)
        if (existingIdx < 0) {
          existingIdx = next.findIndex(
            (m) => m.cycleDrugId === move.cycleDrugId && m.toWeek === move.fromWeek && m.toDay === move.fromDay
          )
        }
        if (existingIdx >= 0) {
          const orig = next[existingIdx]
          if (orig.fromWeek === move.toWeek && orig.fromDay === move.toDay) {
            // Dragged back to original position — cancel the move
            next.splice(existingIdx, 1)
          } else {
            // Update destination, keep original source
            next[existingIdx] = { ...orig, toWeek: move.toWeek, toDay: move.toDay }
          }
        } else {
          next.push(move)
        }
      }
      return next
    })
  }, [])

  const handleWeekChange = useCallback((delta: number) => {
    if (!cycle) return
    const newWeeks = Math.max(1, cycle.total_weeks + delta)

    if (delta < 0 && cycle.cycle_drugs) {
      const affected = cycle.cycle_drugs.filter(
        (cd) => cd.start_week > newWeeks || cd.end_week > newWeeks
      )
      if (affected.length > 0) {
        setPendingWeekDelta(delta)
        setWeekChangeDialogOpen(true)
        return
      }
    }

    updateCycle.mutate({ id, total_weeks: newWeeks })
  }, [cycle, id, updateCycle])

  const handleConfirmWeekChange = useCallback(async () => {
    if (!cycle) return
    const newWeeks = Math.max(1, cycle.total_weeks + pendingWeekDelta)

    for (const cd of cycle.cycle_drugs || []) {
      if (cd.start_week > newWeeks) {
        await removeCycleDrug.mutateAsync({ id: cd.id, cycle_id: id })
      } else if (cd.end_week > newWeeks) {
        await updateCycleDrug.mutateAsync({ id: cd.id, cycle_id: id, end_week: newWeeks })
      }
    }

    updateCycle.mutate({ id, total_weeks: newWeeks })
    setWeekChangeDialogOpen(false)
  }, [cycle, pendingWeekDelta, id, removeCycleDrug, updateCycleDrug, updateCycle])

  const handleDelete = useCallback(() => {
    deleteCycle.mutate(id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        router.push('/cycles')
      },
    })
  }, [id, deleteCycle, router])

  const handleArchive = useCallback(() => {
    updateStatus.mutate({ id, status: 'Archived' })
  }, [id, updateStatus])

  const handleStatusChange = useCallback((next: CycleStatus) => {
    if (!cycle || next === cycle.status) return
    // → Completed = shipped: deduct on-hand inventory + write shipment ledger.
    if (next === 'Completed') {
      const items = inventoryDeltas
        .map((d) => {
          const isE3D = d.ester_type === 'E3D'
          const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT' || d.category === 'Other')
          // inventory_count units: tablets for oral/PCT/Other, vials for injectable/E3D
          const units = isOral ? Math.round(d.needed_ml) : d.needed_vials
          return { drug_id: d.drug_id, units }
        })
        .filter((it) => it.units > 0)
      completeCycle.mutate({ id, items })
      return
    }
    // Completed → 排制中/測試中: restore the deducted stock from the ledger snapshot.
    if (cycle.status === 'Completed' && next !== 'Archived') {
      revertCycle.mutate({ id, status: next })
      return
    }
    // Everything else (incl. Completed → Archived) is a plain status change.
    updateStatus.mutate({ id, status: next })
  }, [cycle, id, inventoryDeltas, completeCycle, revertCycle, updateStatus])

  const isEditable = isAdmin && cycle?.status !== 'Archived'

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>
  }
  if (!cycle) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">找不到課表</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href={`/people/${cycle.person_id}`} aria-label="返回" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {isEditable ? (
                <input
                  className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 -mx-1 min-w-0"
                  value={localName ?? cycle.name ?? ''}
                  placeholder={`${(cycle as any).person?.nickname} 的課表`}
                  onChange={(e) => setLocalName(e.target.value)}
                  onBlur={() => {
                    if (localName !== null && localName !== (cycle.name ?? '')) {
                      updateCycle.mutate({ id, name: localName || null })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.currentTarget.blur()
                    }
                  }}
                />
              ) : (
                <h1 className="text-2xl font-bold">
                  {cycle.name || `${(cycle as any).person?.nickname} 的課表`}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{cycle.total_weeks} 週</span>
              {isEditable ? (
                <>
                  <span>|</span>
                  {cycle.start_date ? (
                    <>
                      <span>開始:</span>
                      <Input
                        type="date"
                        className="h-7 w-auto text-sm"
                        value={cycle.start_date}
                        onChange={(e) => updateCycle.mutate({ id, start_date: e.target.value || null })}
                      />
                      <button
                        className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => updateCycle.mutate({ id, start_date: null })}
                      >
                        清除
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => updateCycle.mutate({ id, start_date: new Date().toISOString().split('T')[0] })}
                    >
                      設定開始日期
                    </button>
                  )}
                </>
              ) : (
                cycle.start_date && <span>| 開始: {new Date(cycle.start_date).toLocaleDateString('zh-TW')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <Select
                value={cycle.status}
                onValueChange={(v: string | null) => v && handleStatusChange(v as CycleStatus)}
              >
                <SelectTrigger className={cn('w-32', statusColors[cycle.status])}>
                  <SelectValue>
                    {(value: string | null) => value ? statusLabels[value as CycleStatus] ?? value : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">排制中</SelectItem>
                  <SelectItem value="Testing">測試中</SelectItem>
                  <SelectItem value="Completed">已完成</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleSave} disabled={saveCells.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveCells.isPending ? '儲存中...' : '儲存'}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              匯出
          </Button>
          {(cycle.cycle_drugs && cycle.cycle_drugs.length > 0 || (isAdmin && cycle.status !== 'Archived')) && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="更多選項" />}>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cycle.cycle_drugs && cycle.cycle_drugs.length > 0 && (
                  <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    儲存為模板
                  </DropdownMenuItem>
                )}
                {isAdmin && cycle.status !== 'Archived' && (
                  <>
                    <DropdownMenuSeparator />
                    {cycle.status === 'Completed' && (
                      <DropdownMenuItem onClick={handleArchive}>
                        <Archive className="mr-2 h-4 w-4" />
                        封存課表
                      </DropdownMenuItem>
                    )}
                    {(cycle.status === 'Scheduled' || cycle.status === 'Planned' || cycle.status === 'Testing') && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        刪除課表
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Notes */}
      {isEditable ? (
        <Textarea
          value={localNotes ?? cycle.notes ?? ''}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => {
            if (localNotes !== null && localNotes !== (cycle.notes ?? '')) {
              updateCycle.mutate({ id, notes: localNotes || null })
            }
          }}
          placeholder="課表備註 / 目標..."
          rows={2}
          className="text-sm"
        />
      ) : cycle.notes ? (
        <p className="text-sm text-muted-foreground">{cycle.notes}</p>
      ) : null}

      {/* Controls */}
      {isEditable && (
        <div className="flex items-center gap-3">
          <Button onClick={() => setDrugSelectorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增藥物
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => handleWeekChange(-1)} aria-label="減少一週">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">{cycle.total_weeks} 週</span>
            <Button variant="outline" size="icon" onClick={() => handleWeekChange(1)} aria-label="增加一週">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cycle Drugs List */}
      {cycle.cycle_drugs && cycle.cycle_drugs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">已選藥物</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Group cycle_drugs by drug_id
                const grouped = new Map<string, typeof cycle.cycle_drugs>()
                for (const cd of cycle.cycle_drugs!) {
                  const key = cd.drug_id
                  if (!grouped.has(key)) grouped.set(key, [])
                  grouped.get(key)!.push(cd)
                }
                return Array.from(grouped.values()).map((entries) => (
                  <div key={entries[0].drug_id} className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-sm">
                    <Link href={`/drugs/${entries[0].drug_id}/edit?from=${encodeURIComponent(`/cycles/${id}`)}`} className="font-medium hover:underline">
                      {entries[0].drug?.name}
                    </Link>
                    {entries.map((cd, i) => {
                      const doseText = cd.injection_ml
                        ? `${cd.injection_ml}ml × ${cd.total_injections}次`
                        : cd.weekly_dose
                          ? `${cd.weekly_dose}${getDoseUnit(cd.drug?.unit)}/wk`
                          : `${cd.daily_dose}${getDoseUnit(cd.drug?.unit)}/day`
                      return (
                        <span key={cd.id} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground/50">·</span>}
                          {isEditable ? (
                            <button
                              type="button"
                              onClick={() => setEditingCycleDrug({
                                id: cd.id,
                                drug_id: cd.drug_id,
                                start_week: cd.start_week,
                                end_week: cd.end_week,
                                weekly_dose: cd.weekly_dose,
                                daily_dose: cd.daily_dose,
                                injection_ml: cd.injection_ml,
                                total_injections: cd.total_injections,
                                schedule_mode: cd.schedule_mode,
                                drug: cd.drug ? { name: cd.drug.name, unit: cd.drug.unit } : null,
                              })}
                              className="-mx-0.5 flex items-center gap-1 rounded px-0.5 text-muted-foreground hover:bg-background/60 hover:underline"
                              title="點擊修改劑量與週數"
                            >
                              <span>{doseText}</span>
                              <span>W{cd.start_week}-{cd.end_week}</span>
                            </button>
                          ) : (
                            <>
                              <span className="text-muted-foreground">{doseText}</span>
                              <span className="text-muted-foreground">
                                W{cd.start_week}-{cd.end_week}
                              </span>
                            </>
                          )}
                          {isEditable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => removeCycleDrug.mutate({ id: cd.id, cycle_id: id })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      <div className="rounded-md border bg-card">
        <ScheduleGrid
          totalWeeks={cycle.total_weeks}
          cells={displayCells}
          cycleDrugs={(cycle.cycle_drugs || []) as any}
          inventoryDeficits={inventoryDeficitsMap}
          isAdmin={isAdmin}
          onCellEdit={(cellKey, value, ml) => {
            setLocalOverrides((prev) => {
              const next = new Map(prev)
              next.set(cellKey, { value, ml })
              return next
            })
          }}
          startDate={cycle.start_date}
          onSkipToggle={isEditable ? handleSkipToggle : undefined}
          onCellMove={isEditable ? handleCellMove : undefined}
        />
      </div>

      {/* Inventory Summary */}
      <CalculationSummary deltas={inventoryDeltas} />

      {/* Sale price (NTD) — bottom-right under the stats table */}
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">售價金額 (NTD)</span>
          {isEditable ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                className="h-9 w-40 text-right"
                placeholder="—"
                value={localSalePrice ?? cycle.sale_price?.toString() ?? ''}
                onChange={(e) => setLocalSalePrice(e.target.value)}
                onBlur={() => {
                  if (localSalePrice === null) return
                  const next = localSalePrice === '' ? null : parseInt(localSalePrice, 10)
                  if (next !== (cycle.sale_price ?? null) && (next === null || Number.isFinite(next))) {
                    updateCycle.mutate({ id, sale_price: next })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur()
                }}
              />
              <span className="min-w-20 text-right text-sm font-semibold tabular-nums">
                {(() => {
                  const raw = localSalePrice ?? cycle.sale_price?.toString() ?? ''
                  return raw && Number(raw) > 0 ? `NT$ ${formatThousands(Number(raw))}` : ''
                })()}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold tabular-nums">
              {cycle.sale_price != null ? `NT$ ${formatThousands(cycle.sale_price)}` : '—'}
            </span>
          )}
        </div>
      </div>

      {/* Drug Selector Dialog */}
      <DrugSelector
        open={drugSelectorOpen}
        onClose={() => setDrugSelectorOpen(false)}
        onAdd={handleAddDrug}
        onReplace={handleReplaceDrug}
        totalWeeks={cycle.total_weeks}
        existingCycleDrugs={cycle.cycle_drugs?.map(cd => ({
          id: cd.id,
          drug_id: cd.drug_id,
          start_week: cd.start_week,
          end_week: cd.end_week,
          weekly_dose: cd.weekly_dose,
          daily_dose: cd.daily_dose,
          injection_ml: cd.injection_ml,
          total_injections: cd.total_injections,
          schedule_mode: cd.schedule_mode,
          custom_days: cd.custom_days,
          interval_days: cd.interval_days,
          drug: cd.drug ? { name: cd.drug.name } : null,
        })) || []}
      />

      {/* Edit Cycle Drug Dialog — change dose / week range of an existing entry */}
      <EditCycleDrugDialog
        key={editingCycleDrug?.id ?? 'edit-cd-closed'}
        open={editingCycleDrug !== null}
        onClose={() => setEditingCycleDrug(null)}
        cycleDrug={editingCycleDrug}
        totalWeeks={cycle.total_weeks}
        onSave={handleUpdateCycleDrug}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              此操作會永久刪除課表「{cycle.name || '未命名'}」及所有排程資料，無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCycle.isPending}
            >
              {deleteCycle.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Week Change Confirmation Dialog */}
      <Dialog open={weekChangeDialogOpen} onOpenChange={setWeekChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認縮減週數</DialogTitle>
            <DialogDescription>
              {(() => {
                if (!cycle) return null
                const newWeeks = Math.max(1, cycle.total_weeks + pendingWeekDelta)
                const toRemove = cycle.cycle_drugs?.filter(cd => cd.start_week > newWeeks) || []
                const toTrim = cycle.cycle_drugs?.filter(cd => cd.start_week <= newWeeks && cd.end_week > newWeeks) || []
                return (
                  <>
                    {toRemove.length > 0 && <span className="block">將移除：{toRemove.map(cd => `${cd.drug?.name} (W${cd.start_week}-${cd.end_week})`).join('、')}</span>}
                    {toTrim.length > 0 && <span className="block">將縮減：{toTrim.map(cd => `${cd.drug?.name} (W${cd.end_week} → W${newWeeks})`).join('、')}</span>}
                  </>
                )
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekChangeDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmWeekChange}>確認縮減</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <CycleExportDialog id={id} open={exportDialogOpen} onOpenChange={setExportDialogOpen} />

      {/* Save as Template Dialog */}
      <SaveTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        cycleName={cycle.name}
        cycleNotes={cycle.notes}
        totalWeeks={cycle.total_weeks}
        cycleDrugs={(cycle.cycle_drugs || []) as any}
      />
    </div>
  )
}
