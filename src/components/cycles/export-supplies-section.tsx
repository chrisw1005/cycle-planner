'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
import type { Supply, SupplySummary, SupplyRuleType } from '@/types'

const RULE_LABELS: Record<SupplyRuleType, string> = {
  per_injection: '每次注射 ×',
  per_day: '每天 ×',
  per_week: '每週 ×',
  fixed: '整個週期固定',
}

interface Props {
  cycleId: string
  totalWeeks: number
  injectionEventCount: number
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  onSummariesChange: (summaries: SupplySummary[]) => void
}

export function ExportSuppliesSection({
  cycleId,
  totalWeeks,
  injectionEventCount,
  enabled,
  onEnabledChange,
  onSummariesChange,
}: Props) {
  const { data: supplies = [] } = useSupplies()
  const { data: cycleSupplies = [] } = useCycleSupplies(cycleId)
  const upsert = useUpsertCycleSupply()
  const removeSel = useDeleteCycleSupply()
  const createSupply = useCreateSupply()
  const updateSupply = useUpdateSupply()
  const deleteSupply = useDeleteSupply()

  const [addingNew, setAddingNew] = useState(false)
  const [editing, setEditing] = useState<Supply | null>(null)

  const selectedMap = useMemo(
    () => new Map(cycleSupplies.map((cs) => [cs.supply_id, cs])),
    [cycleSupplies]
  )

  // Push computed summaries up so the parent can hand them to the export functions.
  useEffect(() => {
    if (!enabled) {
      onSummariesChange([])
      return
    }
    const out: SupplySummary[] = []
    for (const cs of cycleSupplies) {
      const s = supplies.find((x) => x.id === cs.supply_id)
      if (!s) continue
      const auto = computeSupplyQuantity(s, totalWeeks, injectionEventCount)
      out.push({ name: s.name, unit: s.unit, quantity: cs.override_quantity ?? auto })
    }
    onSummariesChange(out)
  }, [enabled, supplies, cycleSupplies, totalWeeks, injectionEventCount, onSummariesChange])

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
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer"
                  checked={checked}
                  onChange={(e) => handleToggleSupply(s, e.target.checked)}
                />
                <span className="flex-1 font-medium">{s.name}</span>
                {checked ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      自動 {auto}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-20 text-sm"
                      placeholder={String(auto)}
                      value={sel?.override_quantity ?? ''}
                      onChange={(e) => handleOverrideChange(s, e.target.value)}
                    />
                    <span className="text-xs w-8">{s.unit}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground w-32 text-right">
                    {RULE_LABELS[s.rule_type]}
                    {s.rule_type !== 'fixed' && s.rule_value !== 1 ? s.rule_value : ''}
                    {s.rule_type === 'fixed' ? ` ${s.rule_value}` : ''}
                  </span>
                )}
                {!s.is_system && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(s)}
                      aria-label="編輯用具"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (confirm(`刪除「${s.name}」？`)) deleteSupply.mutate(s.id)
                      }}
                      aria-label="刪除用具"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
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
