'use client'

import { useMemo, useState, useCallback, type DragEvent } from 'react'
import { cn, getDayLabels } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pencil, TriangleAlert } from 'lucide-react'
import type { CycleCell, CycleDrug, Drug } from '@/types'
import { getExpectedMl } from '@/lib/calculations/schedule-engine'


interface CycleDrugWithDrug extends CycleDrug {
  drug: Drug
}

export interface CellMoveData {
  cycleDrugId: string
  fromWeek: number
  fromDay: number
  toWeek: number
  toDay: number
}

interface ScheduleGridProps {
  totalWeeks: number
  cells: CycleCell[]
  cycleDrugs: CycleDrugWithDrug[]
  inventoryDeficits: Map<string, number>
  isAdmin: boolean
  startDate?: string | null
  onCellEdit?: (cellKey: string, value: string, mlAmount: number | null) => void
  onSkipToggle?: (cycleDrugId: string, weekNumber: number, dayOfWeek: number) => void
  onCellMove?: (moves: CellMoveData[]) => void
}

export function ScheduleGrid({
  totalWeeks,
  cells,
  cycleDrugs,
  inventoryDeficits,
  isAdmin,
  startDate,
  onCellEdit,
  onSkipToggle,
  onCellMove,
}: ScheduleGridProps) {
  const dayLabels = getDayLabels(startDate)
  // Group cells by week+day
  const cellMap = useMemo(() => {
    const map = new Map<string, CycleCell[]>()
    for (const cell of cells) {
      const key = `${cell.week_number}-${cell.day_of_week}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(cell)
    }
    return map
  }, [cells])

  // Build expected ml map for validation
  const expectedMlMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const cd of cycleDrugs) {
      map.set(cd.id, getExpectedMl(cd as any))
    }
    return map
  }, [cycleDrugs])

  // Drugs with inventory issues
  const lowInventoryDrugIds = useMemo(() => {
    const ids = new Set<string>()
    inventoryDeficits.forEach((deficit, drugId) => {
      if (deficit < 0) ids.add(drugId)
    })
    return ids
  }, [inventoryDeficits])

  // Drag state for visual feedback
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const handleDragOver = useCallback((e: DragEvent<HTMLTableCellElement>, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey(key)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLTableCellElement>, toWeek: number, toDay: number) => {
    e.preventDefault()
    setDragOverKey(null)

    const raw = e.dataTransfer.getData('application/json')
    if (!raw || !onCellMove) return

    try {
      const data: { cycleDrugIds: string[]; fromWeek: number; fromDay: number } = JSON.parse(raw)
      if (data.fromWeek === toWeek && data.fromDay === toDay) return

      // Validate: target must be within total_weeks
      if (toWeek < 1 || toWeek > totalWeeks) return

      // Validate: target must be within each drug's week range,
      // and target cell must not already contain the same cycle_drug
      const targetCells = cellMap.get(`${toWeek}-${toDay}`) || []
      const targetCycleDrugIds = new Set(targetCells.filter(c => !c.is_skipped).map(c => c.cycle_drug_id))

      const validMoves: CellMoveData[] = []
      for (const cdId of data.cycleDrugIds) {
        if (targetCycleDrugIds.has(cdId)) continue
        const cd = cycleDrugs.find((d) => d.id === cdId)
        if (cd && toWeek >= cd.start_week && toWeek <= cd.end_week) {
          validMoves.push({
            cycleDrugId: cdId,
            fromWeek: data.fromWeek,
            fromDay: data.fromDay,
            toWeek,
            toDay,
          })
        }
      }

      if (validMoves.length > 0) {
        onCellMove(validMoves)
      }
    } catch {
      // ignore invalid drag data
    }
  }, [onCellMove, totalWeeks, cycleDrugs, cellMap])

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card border border-border px-3 py-2 text-left font-medium min-w-[80px]">
              Week
            </th>
            {dayLabels.map((day, i) => (
              <th
                key={i}
                className="border border-border px-3 py-2 text-center font-medium min-w-[140px]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: totalWeeks }, (_, weekIdx) => {
            const weekNum = weekIdx + 1
            return (
              <tr key={weekNum}>
                <td className="sticky left-0 z-10 bg-card border border-border px-3 py-2 font-medium text-muted-foreground">
                  Week {weekNum}
                </td>
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const dayNum = dayIdx + 1
                  const key = `${weekNum}-${dayNum}`
                  const dayCells = cellMap.get(key) || []

                  return (
                    <ScheduleCell
                      key={key}
                      cellKey={key}
                      weekNumber={weekNum}
                      dayOfWeek={dayNum}
                      cells={dayCells}
                      cycleDrugs={cycleDrugs}
                      expectedMlMap={expectedMlMap}
                      lowInventoryDrugIds={lowInventoryDrugIds}
                      isAdmin={isAdmin}
                      isDragOver={dragOverKey === key}
                      canDrag={!!onCellMove}
                      onEdit={onCellEdit}
                      onSkipToggle={onSkipToggle}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface ScheduleCellProps {
  cellKey: string
  weekNumber: number
  dayOfWeek: number
  cells: CycleCell[]
  cycleDrugs: CycleDrugWithDrug[]
  expectedMlMap: Map<string, number | null>
  lowInventoryDrugIds: Set<string>
  isAdmin: boolean
  isDragOver: boolean
  canDrag: boolean
  onEdit?: (cellKey: string, value: string, mlAmount: number | null) => void
  onSkipToggle?: (cycleDrugId: string, weekNumber: number, dayOfWeek: number) => void
  onDragOver: (e: DragEvent<HTMLTableCellElement>, key: string) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent<HTMLTableCellElement>, toWeek: number, toDay: number) => void
}

function ScheduleCell({
  cellKey,
  weekNumber,
  dayOfWeek,
  cells,
  cycleDrugs,
  expectedMlMap,
  lowInventoryDrugIds,
  isAdmin,
  isDragOver,
  canDrag,
  onEdit,
  onSkipToggle,
  onDragOver,
  onDragLeave,
  onDrop,
}: ScheduleCellProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editMl, setEditMl] = useState('')

  const hasCells = cells.length > 0
  const hasSkipped = cells.some((c) => c.is_skipped)

  // Check for issues (only non-skipped cells)
  const hasInventoryWarning = cells.some((c) => {
    if (c.is_skipped) return false
    const cd = cycleDrugs.find((d) => d.id === c.cycle_drug_id)
    return cd && lowInventoryDrugIds.has(cd.drug_id)
  })

  const hasMlMismatch = cells.some((c) => {
    if (c.is_skipped) return false
    if (!c.is_manual_override || c.ml_amount == null) return false
    const expected = expectedMlMap.get(c.cycle_drug_id)
    return expected != null && Math.abs(c.ml_amount - expected) > 0.001
  })

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, cell: CycleCell) => {
    e.stopPropagation()
    const payload = {
      cycleDrugIds: [cell.cycle_drug_id],
      fromWeek: cell.week_number,
      fromDay: cell.day_of_week,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragStartAll = useCallback((e: DragEvent<HTMLDivElement>) => {
    const payload = {
      cycleDrugIds: cells.map((c) => c.cycle_drug_id),
      fromWeek: weekNumber,
      fromDay: dayOfWeek,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }, [cells, weekNumber, dayOfWeek])

  return (
    <td
      className={cn(
        'relative border border-border px-2 py-1.5 align-top min-h-[60px] transition-colors',
        hasInventoryWarning && 'bg-red-500/5',
        hasMlMismatch && 'bg-yellow-500/10',
        !hasCells && 'bg-transparent',
        isDragOver && 'bg-primary/10 ring-2 ring-primary/30 ring-inset'
      )}
      onDragOver={(e) => onDragOver(e, cellKey)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, weekNumber, dayOfWeek)}
    >
      {hasSkipped && (
        <TriangleAlert className="absolute top-1 right-1 h-3 w-3 text-yellow-500/50" />
      )}
      <div className="space-y-0.5">
        {cells.map((cell, i) => (
          <div
            key={cell.id || `${cellKey}-${i}`}
            draggable={canDrag}
            onDragStart={(e) => handleDragStart(e, cell)}
            className={cn(
              'text-xs leading-tight select-none rounded px-0.5',
              cell.is_skipped
                ? 'line-through opacity-40'
                : cn(
                    cell.is_manual_override && 'text-yellow-500',
                    hasInventoryWarning && 'text-red-400'
                  ),
              isAdmin && 'cursor-pointer hover:opacity-70 transition-opacity',
              canDrag && 'cursor-grab active:cursor-grabbing'
            )}
            onClick={() => {
              if (isAdmin && onSkipToggle) {
                onSkipToggle(cell.cycle_drug_id, cell.week_number, cell.day_of_week)
              }
            }}
          >
            {(() => {
              const v = cell.display_value || ''
              // Split "DrugName 0.8ml" or "DrugName 30mg (3)" into name + dose
              const match = v.match(/^(.+?)\s+(\d[\d.]*\s*(?:ml|mg|IU|mcg).*)$/i)
              if (match) {
                return (
                  <span className="flex justify-between gap-1">
                    <span>{match[1]}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{match[2]}</span>
                  </span>
                )
              }
              return v
            })()}
          </div>
        ))}
      </div>
      {hasCells && isAdmin && (
        <div className="flex items-center gap-1 mt-1">
          <Popover open={editOpen} onOpenChange={setEditOpen}>
            <PopoverTrigger
              render={<button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            >
                <Pencil className="h-3 w-3" />
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <p className="text-xs font-medium">編輯格子</p>
                <Input
                  placeholder="顯示文字"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="ml 數值"
                  type="number"
                  step="any"
                  value={editMl}
                  onChange={(e) => setEditMl(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onEdit?.(cellKey, editValue, editMl ? parseFloat(editMl) : null)
                    setEditOpen(false)
                  }}
                >
                  確認
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {canDrag && cells.length > 1 && (
            <div
              draggable
              onDragStart={handleDragStartAll}
              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              title="拖曳整格所有藥物"
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
            </div>
          )}
        </div>
      )}
    </td>
  )
}
