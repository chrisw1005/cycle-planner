'use client'

import React, { useMemo, useState } from 'react'
import {
  useSupplies,
  useCreateSupply,
  useUpdateSupply,
  useDeleteSupply,
  useReorderSupplies,
  type SupplyInput,
} from '@/hooks/use-supplies'
import {
  useCycleSupplies,
  useUpsertCycleSupply,
  useDeleteCycleSupply,
} from '@/hooks/use-cycle-supplies'
import { computeSupplyQuantity } from '@/lib/calculations/supply-calculator'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus, Check, X, GripVertical } from 'lucide-react'
import type { Supply, SupplyRuleType } from '@/types'

const RULE_LABELS: Record<SupplyRuleType, string> = {
  per_injection: '每次注射 ×',
  per_day: '每天 ×',
  per_week: '每週 ×',
  fixed: '整個週期固定',
}

// Stable references so consumers using these as defaults don't trigger
// useEffect / useMemo loops on every render.
const EMPTY_SUPPLIES: Supply[] = []
const EMPTY_CYCLE_SUPPLIES: import('@/types').CycleSupply[] = []

interface Props {
  cycleId: string
  totalWeeks: number
  injectionEventCount: number
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  overrides: Record<string, string>
  onOverridesChange: (next: Record<string, string>) => void
}

export function ExportSuppliesSection({
  cycleId,
  totalWeeks,
  injectionEventCount,
  enabled,
  onEnabledChange,
  overrides,
  onOverridesChange,
}: Props) {
  const { data: suppliesData } = useSupplies()
  const { data: cycleSuppliesData } = useCycleSupplies(cycleId)
  const upsert = useUpsertCycleSupply()
  const removeSel = useDeleteCycleSupply()
  const createSupply = useCreateSupply()
  const updateSupply = useUpdateSupply()
  const deleteSupply = useDeleteSupply()
  const reorder = useReorderSupplies()

  const [addingNew, setAddingNew] = useState(false)
  const [editing, setEditing] = useState<Supply | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const supplies = suppliesData ?? EMPTY_SUPPLIES
  const cycleSupplies = cycleSuppliesData ?? EMPTY_CYCLE_SUPPLIES

  const selectedMap = useMemo(
    () => new Map(cycleSupplies.map((cs) => [cs.supply_id, cs])),
    [cycleSupplies]
  )

  const handleToggleSupply = (s: Supply, checked: boolean) => {
    if (checked) {
      upsert.mutate({ cycle_id: cycleId, supply_id: s.id })
    } else {
      removeSel.mutate({ cycle_id: cycleId, supply_id: s.id })
      // Clear the in-memory override too — un-checking discards any tweak
      // from this dialog session.
      if (s.id in overrides) {
        const { [s.id]: _omit, ...rest } = overrides
        onOverridesChange(rest)
      }
    }
  }

  const handleOverrideChange = (id: string, raw: string) => {
    onOverridesChange({ ...overrides, [id]: raw })
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/supply-id', id)
    e.dataTransfer.effectAllowed = 'move'
    // Build a clean drag image from a clone of the row, placed off-screen
    // with an opaque background. Using the live row directly is unreliable:
    // - Chrome captures the drag image after the dragstart handler returns,
    //   which is also when React commits state from this event. If we dim
    //   the source row, the captured image is dim too.
    // - When the source row has opacity-40, Chrome alpha-composites the
    //   layers behind it (schedule cells, drug stats text) into the drag
    //   image, producing the "16 週 / 18 顆" bleed-through artifacts.
    // A detached clone with opacity:1 and a solid bg avoids both issues.
    const row = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-supply-row]')
    if (row) {
      const rect = row.getBoundingClientRect()
      const clone = row.cloneNode(true) as HTMLElement
      clone.style.position = 'absolute'
      clone.style.top = '-1000px'
      clone.style.left = '0'
      clone.style.width = `${rect.width}px`
      clone.style.opacity = '1'
      clone.style.background = 'var(--background)'
      clone.style.padding = '4px 8px'
      clone.style.border = '1px solid var(--border)'
      clone.style.borderRadius = '6px'
      clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
      clone.style.pointerEvents = 'none'
      document.body.appendChild(clone)
      e.dataTransfer.setDragImage(clone, e.clientX - rect.left, e.clientY - rect.top)
      // Browser captures synchronously around dragstart's return; remove
      // on the next tick so we don't pollute the document.
      setTimeout(() => clone.remove(), 0)
    }
    // Defer source dim so React doesn't commit opacity-40 before capture.
    requestAnimationFrame(() => setDraggingId(id))
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!e.dataTransfer.types.includes('text/supply-id')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }
  const handleDragLeave = () => setDragOverId(null)
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggingId(null)
    const sourceId = e.dataTransfer.getData('text/supply-id')
    if (!sourceId || sourceId === targetId) return
    const sourceIdx = supplies.findIndex((s) => s.id === sourceId)
    const targetIdx = supplies.findIndex((s) => s.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0) return
    const next = [...supplies]
    const [moved] = next.splice(sourceIdx, 1)
    next.splice(targetIdx, 0, moved)
    reorder.mutate(next.map((s) => s.id))
  }

  return (
    <div className="border rounded-md">
      <div className="flex items-center gap-2 p-3 border-b">
        <Switch checked={enabled} onCheckedChange={onEnabledChange} size="sm" />
        <span className="text-sm font-medium">包含用具清單</span>
        {enabled && (
          <span className="text-xs text-muted-foreground ml-auto">
            匯出時於藥物統計右側顯示「其他」表
          </span>
        )}
      </div>

      {enabled && (
        <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
          {supplies.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">尚無用具，請點下方「新增用具」建立第一筆。</p>
          )}
          {supplies.map((s) => {
            const sel = selectedMap.get(s.id)
            const checked = !!sel
            const auto = computeSupplyQuantity(s, totalWeeks, injectionEventCount)
            const ruleSummary =
              s.rule_type === 'fixed'
                ? `${RULE_LABELS.fixed} ${s.rule_value}`
                : s.rule_value === 1
                  ? `${RULE_LABELS[s.rule_type]} 1`
                  : `${RULE_LABELS[s.rule_type]} ${s.rule_value}`
            const isDropTarget = dragOverId === s.id
            const isDragging = draggingId === s.id
            return (
              <div
                key={s.id}
                data-supply-row={s.id}
                onDragOver={(e) => handleDragOver(e, s.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, s.id)}
                className={`flex items-center gap-2 text-sm py-1 transition-opacity ${isDropTarget ? 'border-t-2 border-primary -mt-px' : 'border-t-2 border-transparent -mt-px'} ${isDragging ? 'opacity-40' : ''}`}
              >
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, s.id)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground shrink-0 select-none"
                  aria-label={`拖曳重排「${s.name}」`}
                  title="拖曳重排"
                  role="button"
                  tabIndex={-1}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer shrink-0"
                  checked={checked}
                  onChange={(e) => handleToggleSupply(s, e.target.checked)}
                />
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate">{s.name}</span>
                  {s.is_system && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap leading-none"
                      title="系統預設用具"
                    >
                      預設
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {ruleSummary}
                  </span>
                </div>
                {checked && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">自動 {auto}</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-20 text-sm"
                      placeholder={String(auto)}
                      value={overrides[s.id] ?? ''}
                      onChange={(e) => handleOverrideChange(s.id, e.target.value)}
                    />
                    <span className="text-xs w-6">{s.unit}</span>
                  </div>
                )}
                <div className="flex items-center gap-0.5 shrink-0 ml-1 pl-2 border-l">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(s)}
                    aria-label={`編輯「${s.name}」`}
                    title={`編輯「${s.name}」`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const msg = s.is_system
                        ? `「${s.name}」是系統預設用具，確定要刪除嗎？\n刪除後可隨時點「+ 新增用具」再次建立。`
                        : `確定要刪除用具「${s.name}」嗎？\n刪除後可隨時點「+ 新增用具」再次建立。`
                      if (confirm(msg)) deleteSupply.mutate(s.id)
                    }}
                    aria-label={`刪除「${s.name}」`}
                    title={`刪除「${s.name}」`}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}

          <div className="pt-2">
            {addingNew ? (
              <SupplyForm
                initial={null}
                submitting={createSupply.isPending}
                onSubmit={(data) =>
                  createSupply.mutate(data, { onSuccess: () => setAddingNew(false) })
                }
                onCancel={() => setAddingNew(false)}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                新增用具
              </Button>
            )}
          </div>

          {editing && (
            <div className="pt-2">
              <SupplyForm
                initial={editing}
                submitting={updateSupply.isPending}
                onSubmit={(data) =>
                  updateSupply.mutate(
                    { id: editing.id, ...data },
                    { onSuccess: () => setEditing(null) }
                  )
                }
                onCancel={() => setEditing(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SupplyFormProps {
  initial: Supply | null
  submitting: boolean
  onSubmit: (data: SupplyInput) => void
  onCancel: () => void
}

function SupplyForm({ initial, submitting, onSubmit, onCancel }: SupplyFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '支')
  const [ruleType, setRuleType] = useState<SupplyRuleType>(initial?.rule_type ?? 'per_injection')
  const [ruleValue, setRuleValue] = useState(String(initial?.rule_value ?? 1))

  const handleSubmit = () => {
    if (!name.trim() || !unit.trim()) return
    const v = Number(ruleValue) || 1
    onSubmit({
      name: name.trim(),
      unit: unit.trim(),
      rule_type: ruleType,
      rule_value: v,
      display_order: initial?.display_order ?? 1000,
    })
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="supply-name" className="text-xs">名稱 *</Label>
          <Input
            id="supply-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：碘酒棉棒"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="supply-unit" className="text-xs">單位 *</Label>
          <Input
            id="supply-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="支 / 片 / 盒"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">規則</Label>
          <Select value={ruleType} onValueChange={(v: string | null) => v && setRuleType(v as SupplyRuleType)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue>
                {(value: string | null) => (value ? RULE_LABELS[value as SupplyRuleType] : '選擇規則')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_injection">每次注射</SelectItem>
              <SelectItem value="per_day">每天</SelectItem>
              <SelectItem value="per_week">每週</SelectItem>
              <SelectItem value="fixed">整個週期固定</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="supply-value" className="text-xs">
            倍率／數量 {ruleType === 'fixed' ? '(總量)' : '(× 事件)'}
          </Label>
          <Input
            id="supply-value"
            type="number"
            min={0}
            step={0.5}
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          <X className="h-3.5 w-3.5 mr-1" />
          取消
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting || !name.trim() || !unit.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" />
          儲存
        </Button>
      </div>
    </div>
  )
}
