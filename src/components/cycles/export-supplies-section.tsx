'use client'

import React, { useMemo, useState } from 'react'
import {
  useSupplies,
  useCreateSupply,
  useUpdateSupply,
  useDeleteSupply,
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
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
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
}

export function ExportSuppliesSection({
  cycleId,
  totalWeeks,
  injectionEventCount,
  enabled,
  onEnabledChange,
}: Props) {
  const { data: suppliesData } = useSupplies()
  const { data: cycleSuppliesData } = useCycleSupplies(cycleId)
  const upsert = useUpsertCycleSupply()
  const removeSel = useDeleteCycleSupply()
  const createSupply = useCreateSupply()
  const updateSupply = useUpdateSupply()
  const deleteSupply = useDeleteSupply()

  const [addingNew, setAddingNew] = useState(false)
  const [editing, setEditing] = useState<Supply | null>(null)

  const supplies = suppliesData ?? EMPTY_SUPPLIES
  const cycleSupplies = cycleSuppliesData ?? EMPTY_CYCLE_SUPPLIES

  const selectedMap = useMemo(
    () => new Map(cycleSupplies.map((cs) => [cs.supply_id, cs])),
    [cycleSupplies]
  )

  const handleToggleSupply = (s: Supply, checked: boolean) => {
    if (checked) {
      upsert.mutate({ cycle_id: cycleId, supply_id: s.id, override_quantity: null })
    } else {
      removeSel.mutate({ cycle_id: cycleId, supply_id: s.id })
    }
  }

  const handleOverrideChange = (s: Supply, raw: string) => {
    const val = raw.trim() === '' ? null : Number(raw)
    upsert.mutate({ cycle_id: cycleId, supply_id: s.id, override_quantity: val })
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
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer shrink-0"
                  checked={checked}
                  onChange={(e) => handleToggleSupply(s, e.target.checked)}
                />
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate">{s.name}</span>
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
                      value={sel?.override_quantity ?? ''}
                      onChange={(e) => handleOverrideChange(s, e.target.value)}
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
                      if (confirm(`確定要刪除用具「${s.name}」嗎？\n刪除後可隨時點「+ 新增用具」再次建立。`)) {
                        deleteSupply.mutate(s.id)
                      }
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
