'use client'

import { useState } from 'react'
import { useDrugs } from '@/hooks/use-drugs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Drug } from '@/types'

interface DrugSelectorProps {
  open: boolean
  onClose: () => void
  onAdd: (data: {
    drug_id: string
    weekly_dose?: number
    daily_dose?: number
    injection_ml?: number
    total_injections?: number
    start_week: number
    end_week: number
  }) => void
  totalWeeks: number
  existingDrugIds?: string[]
}

export function DrugSelector({ open, onClose, onAdd, totalWeeks, existingDrugIds }: DrugSelectorProps) {
  const { data: drugs } = useDrugs()
  const [selectedDrugId, setSelectedDrugId] = useState('')
  const [weeklyDose, setWeeklyDose] = useState('')
  const [dailyDose, setDailyDose] = useState('')
  const [injectionMl, setInjectionMl] = useState('')
  const [totalInjections, setTotalInjections] = useState('')
  const [startWeek, setStartWeek] = useState('1')
  const [endWeek, setEndWeek] = useState(totalWeeks.toString())

  const selectedDrug = drugs?.find((d) => d.id === selectedDrugId)
  const isE3D = selectedDrug?.primary_category === 'Injectable' && selectedDrug?.ester_type === 'E3D'
  const isInjectable = selectedDrug?.primary_category === 'Injectable' && !isE3D
  const isOral = selectedDrug?.primary_category === 'Oral' || selectedDrug?.primary_category === 'PCT'

  // E3D: auto-calculate end_week from start_week + total_injections
  const e3dEndWeek = (() => {
    if (!isE3D || !totalInjections) return null
    const count = parseInt(totalInjections)
    if (!count || count <= 0) return null
    const absStart = (parseInt(startWeek) - 1) * 7 + 1
    const absLastDay = absStart + (count - 1) * 3
    return Math.ceil(absLastDay / 7)
  })()

  const handleAdd = () => {
    if (!selectedDrugId) return

    if (isE3D) {
      const computedEnd = e3dEndWeek || parseInt(startWeek)
      onAdd({
        drug_id: selectedDrugId,
        injection_ml: parseFloat(injectionMl) || undefined,
        total_injections: parseInt(totalInjections) || undefined,
        start_week: parseInt(startWeek),
        end_week: computedEnd,
      })
    } else {
      onAdd({
        drug_id: selectedDrugId,
        weekly_dose: isInjectable ? parseFloat(weeklyDose) || undefined : undefined,
        daily_dose: isOral ? parseFloat(dailyDose) || undefined : undefined,
        start_week: parseInt(startWeek),
        end_week: parseInt(endWeek),
      })
    }

    // Reset
    setSelectedDrugId('')
    setWeeklyDose('')
    setDailyDose('')
    setInjectionMl('')
    setTotalInjections('')
    setStartWeek('1')
    setEndWeek(totalWeeks.toString())
    onClose()
  }

  // Calculate preview
  let preview = ''
  if (selectedDrug && isInjectable && weeklyDose) {
    const dose = parseFloat(weeklyDose)
    if (selectedDrug.ester_type === 'Long') {
      const ml = Math.round((dose / 2 / selectedDrug.concentration) * 100) / 100
      preview = `每次注射 ${ml}ml (Day 1 & Day 4)`
    } else if (selectedDrug.ester_type === 'Short') {
      const ml = Math.round((dose / 3.5 / selectedDrug.concentration) * 100) / 100
      preview = `每次注射 ${ml}ml (隔日，跨兩週交替)`
    }
  }
  if (selectedDrug && isE3D && injectionMl && totalInjections) {
    const count = parseInt(totalInjections)
    const ml = parseFloat(injectionMl)
    const totalMl = Math.round(ml * count * 100) / 100
    // Generate day pattern preview
    const absStart = (parseInt(startWeek) - 1) * 7 + 1
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const pattern: string[] = []
    let currentWeek = -1
    for (let i = 0; i < Math.min(count, 10); i++) {
      const absDay = absStart + i * 3
      const week = Math.ceil(absDay / 7)
      const day = ((absDay - 1) % 7)
      if (week !== currentWeek) {
        pattern.push(`W${week}: ${dayNames[day]}`)
        currentWeek = week
      } else {
        pattern[pattern.length - 1] += `, ${dayNames[day]}`
      }
    }
    if (count > 10) pattern.push('...')
    preview = `每次 ${ml}ml × ${count} 次 = ${totalMl}ml\n${pattern.join(' → ')}`
  }
  if (selectedDrug && isOral && dailyDose) {
    const tabs = Math.round((parseFloat(dailyDose) / selectedDrug.concentration) * 10) / 10
    preview = `每日 ${dailyDose}mg (${tabs} 顆/天)`
  }

  // E3D: disable button if missing injection_ml or total_injections
  const isDisabled = !selectedDrugId
    || (isInjectable && !weeklyDose)
    || (isOral && !dailyDose)
    || (isE3D && (!injectionMl || !totalInjections))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增藥物至課表</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>選擇藥物 *</Label>
            <Select value={selectedDrugId} onValueChange={(v: string | null) => v && setSelectedDrugId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="選擇庫存中的藥物...">
                  {(value: string | null) => {
                    if (!value) return null
                    const d = drugs?.find(drug => drug.id === value)
                    if (!d) return value
                    return `${d.name} (${d.primary_category}${d.ester_type ? ` - ${d.ester_type === 'Long' ? '長效' : d.ester_type === 'Short' ? '短效' : 'E3D'}` : ''})`
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const grouped = new Map<string, Drug[]>()
                  for (const d of drugs || []) {
                    const key = d.primary_category
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(d)
                  }
                  const categoryLabels: Record<string, string> = { Injectable: '注射劑', Oral: '口服', PCT: 'PCT' }
                  return Array.from(grouped.entries()).map(([cat, items]) => (
                    <SelectGroup key={cat}>
                      <SelectLabel>{categoryLabels[cat] || cat}</SelectLabel>
                      {items.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}{d.ester_type ? ` (${d.ester_type === 'Long' ? '長效' : d.ester_type === 'Short' ? '短效' : 'E3D'})` : ''}
                          {d.inventory_count <= 1 ? ' ⚠️' : ''}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                })()}
              </SelectContent>
            </Select>
          </div>

          {selectedDrugId && existingDrugIds?.includes(selectedDrugId) && (
            <p className="text-xs text-muted-foreground">
              此藥物已在課表中。可重複新增不同週數/劑量（適用於 PCT 漸減劑量等情境）。
            </p>
          )}

          {isInjectable && (
            <div className="space-y-2">
              <Label>每週劑量 (mg/週) *</Label>
              <Input
                type="number"
                step="any"
                value={weeklyDose}
                onChange={(e) => setWeeklyDose(e.target.value)}
                placeholder="e.g. 360"
              />
            </div>
          )}

          {isE3D && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>每次注射量 (ml) *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={injectionMl}
                    onChange={(e) => setInjectionMl(e.target.value)}
                    placeholder="e.g. 0.33"
                  />
                </div>
                <div className="space-y-2">
                  <Label>總注射次數 *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={totalInjections}
                    onChange={(e) => setTotalInjections(e.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
              </div>
              {e3dEndWeek && (
                <p className="text-xs text-muted-foreground">
                  排程將從第 {startWeek} 週開始，至第 {e3dEndWeek} 週結束
                </p>
              )}
            </>
          )}

          {isOral && (
            <div className="space-y-2">
              <Label>每日劑量 (mg/天) *</Label>
              <Input
                type="number"
                step="any"
                value={dailyDose}
                onChange={(e) => setDailyDose(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>
          )}

          {/* Week range — not shown for E3D (auto-calculated) */}
          {!isE3D && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始週</Label>
                <Input
                  type="number"
                  min="1"
                  max={totalWeeks}
                  value={startWeek}
                  onChange={(e) => setStartWeek(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>結束週</Label>
                <Input
                  type="number"
                  min="1"
                  max={totalWeeks}
                  value={endWeek}
                  onChange={(e) => setEndWeek(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* E3D: only show start week */}
          {isE3D && (
            <div className="space-y-2">
              <Label>開始週</Label>
              <Input
                type="number"
                min="1"
                max={totalWeeks}
                value={startWeek}
                onChange={(e) => setStartWeek(e.target.value)}
              />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">預覽：</p>
              <p className="text-muted-foreground whitespace-pre-line">{preview}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleAdd} disabled={isDisabled}>
            新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
