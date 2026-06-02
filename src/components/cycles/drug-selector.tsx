'use client'

import { useState } from 'react'
import { useDrugs } from '@/hooks/use-drugs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getDoseUnit } from '@/lib/utils'
import type { Drug } from '@/types'

interface AddData {
  drug_id: string
  weekly_dose?: number
  daily_dose?: number
  injection_ml?: number
  total_injections?: number
  vial_count?: number
  schedule_mode?: string
  custom_days?: number[]
  interval_days?: number
  start_week: number
  end_week: number
}

export interface ExistingCycleDrug {
  id: string
  drug_id: string
  start_week: number
  end_week: number
  weekly_dose?: number | null
  daily_dose?: number | null
  injection_ml?: number | null
  total_injections?: number | null
  schedule_mode?: string | null
  custom_days?: number[] | null
  interval_days?: number | null
  drug?: { name?: string } | null
}

export interface OverlapReplaceOps {
  toRemove: string[]
  toUpdate: Array<{ id: string; start_week?: number; end_week?: number }>
  toCreate: AddData[]
  newData: AddData
}

interface DrugSelectorProps {
  open: boolean
  onClose: () => void
  onAdd: (data: AddData) => void
  onReplace?: (ops: OverlapReplaceOps) => void
  totalWeeks: number
  existingCycleDrugs?: ExistingCycleDrug[]
}

export function DrugSelector({ open, onClose, onAdd, onReplace, totalWeeks, existingCycleDrugs }: DrugSelectorProps) {
  const { data: drugs } = useDrugs()
  const [selectedDrugId, setSelectedDrugId] = useState('')
  const [weeklyDose, setWeeklyDose] = useState('')
  const [dailyDose, setDailyDose] = useState('')
  const [vialMl, setVialMl] = useState('')
  const [vialCount, setVialCount] = useState('1')
  const [totalInjections, setTotalInjections] = useState('')
  const [scheduleMode, setScheduleMode] = useState('daily')
  const [weeklyTabs, setWeeklyTabs] = useState('')
  const [customDays, setCustomDays] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState('2')
  const [injCustomOn, setInjCustomOn] = useState(false)
  const [injCustomKind, setInjCustomKind] = useState<'days' | 'interval'>('interval')
  const [startWeek, setStartWeek] = useState('1')
  const [endWeek, setEndWeek] = useState(totalWeeks.toString())

  // Overlap confirmation state
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false)
  const [pendingOps, setPendingOps] = useState<OverlapReplaceOps | null>(null)

  const selectedDrug = drugs?.find((d) => d.id === selectedDrugId)
  const isE3D = selectedDrug?.ester_type === 'E3D'
  const isInjectable = selectedDrug?.primary_category === 'Injectable' && !isE3D
  const isOral = !isE3D && (selectedDrug?.primary_category === 'Oral' || selectedDrug?.primary_category === 'PCT')
  const doseUnit = getDoseUnit(selectedDrug?.unit)

  // E3D: auto-calculate ml per injection and end_week
  const e3dTotalMl = (() => {
    if (!isE3D || !vialMl || !vialCount) return null
    return parseFloat(vialMl) * (parseInt(vialCount) || 1)
  })()

  const e3dMlPerInjection = (() => {
    if (!e3dTotalMl || !totalInjections) return null
    const count = parseInt(totalInjections)
    if (!count || count <= 0) return null
    return Math.floor((e3dTotalMl / count) * 100) / 100
  })()

  const e3dEndWeek = (() => {
    if (!isE3D || !totalInjections) return null
    const count = parseInt(totalInjections)
    if (!count || count <= 0) return null
    const absStart = (parseInt(startWeek) - 1) * 7 + 1
    const absLastDay = absStart + (count - 1) * 3
    return Math.ceil(absLastDay / 7)
  })()

  const buildAddData = (): AddData | null => {
    if (!selectedDrugId) return null

    if (isE3D) {
      const computedEnd = e3dEndWeek || parseInt(startWeek)
      return {
        drug_id: selectedDrugId,
        injection_ml: e3dMlPerInjection || undefined,
        total_injections: parseInt(totalInjections) || undefined,
        vial_count: vialCount ? parseInt(vialCount) : undefined,
        start_week: parseInt(startWeek),
        end_week: computedEnd,
      }
    } else if (isInjectable && injCustomOn) {
      return {
        drug_id: selectedDrugId,
        weekly_dose: undefined,
        daily_dose: parseFloat(dailyDose) || undefined,
        schedule_mode: injCustomKind === 'days' ? 'custom_days' : 'custom_interval',
        custom_days: injCustomKind === 'days' ? customDays : undefined,
        interval_days: injCustomKind === 'interval' ? (parseInt(intervalDays) || undefined) : undefined,
        start_week: parseInt(startWeek),
        end_week: parseInt(endWeek),
      }
    } else if (isOral && (scheduleMode === 'custom_days' || scheduleMode === 'custom_interval')) {
      return {
        drug_id: selectedDrugId,
        weekly_dose: undefined,
        daily_dose: parseFloat(dailyDose) || undefined,
        schedule_mode: scheduleMode,
        custom_days: scheduleMode === 'custom_days' ? customDays : undefined,
        interval_days: scheduleMode === 'custom_interval' ? (parseInt(intervalDays) || undefined) : undefined,
        start_week: parseInt(startWeek),
        end_week: parseInt(endWeek),
      }
    } else {
      const isSplitWeekly = isOral && scheduleMode === 'split_weekly'
      return {
        drug_id: selectedDrugId,
        weekly_dose: isInjectable ? parseFloat(weeklyDose) || undefined : isSplitWeekly ? parseFloat(weeklyTabs) * (selectedDrug?.concentration || 1) || undefined : undefined,
        daily_dose: isOral && !isSplitWeekly ? parseFloat(dailyDose) || undefined : undefined,
        schedule_mode: isOral ? scheduleMode : undefined,
        start_week: parseInt(startWeek),
        end_week: parseInt(endWeek),
      }
    }
  }

  const resetForm = () => {
    setSelectedDrugId('')
    setWeeklyDose('')
    setDailyDose('')
    setVialMl('')
    setVialCount('1')
    setTotalInjections('')
    setScheduleMode('daily')
    setWeeklyTabs('')
    setCustomDays([])
    setIntervalDays('2')
    setInjCustomOn(false)
    setInjCustomKind('interval')
    setStartWeek('1')
    setEndWeek(totalWeeks.toString())
  }

  const handleAdd = () => {
    const data = buildAddData()
    if (!data) return

    // Check for overlapping same-drug entries
    const overlapping = existingCycleDrugs?.filter(
      (cd) => cd.drug_id === data.drug_id && data.start_week <= cd.end_week && data.end_week >= cd.start_week
    ) || []

    if (overlapping.length > 0 && onReplace) {
      const ops = computeOverlapOps(overlapping, data)
      setPendingOps(ops)
      setOverlapDialogOpen(true)
      return
    }

    onAdd(data)
    resetForm()
    onClose()
  }

  const handleConfirmReplace = () => {
    if (pendingOps && onReplace) {
      onReplace(pendingOps)
      resetForm()
      setOverlapDialogOpen(false)
      setPendingOps(null)
      onClose()
    }
  }

  const handleCancelOverlap = () => {
    setOverlapDialogOpen(false)
    setPendingOps(null)
  }

  // Fixed-order weekday labels (index 0 = day number 1 = 一)
  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

  // Calculate preview
  let preview = ''
  if (selectedDrug && isInjectable && injCustomOn && dailyDose) {
    const ml = Math.round((parseFloat(dailyDose) / selectedDrug.concentration) * 100) / 100
    if (injCustomKind === 'days') {
      const days = customDays.slice().sort((a, b) => a - b).map((d) => weekdayLabels[d - 1]).join('、')
      preview = `每次注射 ${ml}ml (週${days})`
    } else {
      preview = `每次注射 ${ml}ml (每 ${intervalDays} 天一次)`
    }
  } else if (selectedDrug && isInjectable && weeklyDose) {
    const dose = parseFloat(weeklyDose)
    if (selectedDrug.ester_type === 'Long') {
      const ml = Math.round((dose / 2 / selectedDrug.concentration) * 100) / 100
      preview = `每次注射 ${ml}ml (Day 1 & Day 4)`
    } else if (selectedDrug.ester_type === 'Short') {
      const ml = Math.round((dose / 3.5 / selectedDrug.concentration) * 100) / 100
      preview = `每次注射 ${ml}ml (隔日，跨兩週交替)`
    }
  }
  if (selectedDrug && isE3D && e3dMlPerInjection && e3dTotalMl && totalInjections) {
    const count = parseInt(totalInjections)
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
    const vials = parseInt(vialCount) || 1
    preview = `${vials} 瓶 × ${vialMl}ml = ${e3dTotalMl}ml ÷ ${count} 次 = 每次 ${e3dMlPerInjection}ml\n${pattern.join(' → ')}`
  }
  if (selectedDrug && isOral) {
    if ((scheduleMode === 'custom_days' || scheduleMode === 'custom_interval') && dailyDose) {
      const tabs = Math.round((parseFloat(dailyDose) / selectedDrug.concentration) * 10) / 10
      if (scheduleMode === 'custom_days') {
        const days = customDays.slice().sort((a, b) => a - b).map((d) => weekdayLabels[d - 1]).join('、')
        preview = `每次 ${dailyDose}${doseUnit} (${tabs} 顆) (週${days})`
      } else {
        preview = `每次 ${dailyDose}${doseUnit} (${tabs} 顆) (每 ${intervalDays} 天一次)`
      }
    } else if (scheduleMode === 'split_weekly' && weeklyTabs) {
      const wTabs = parseFloat(weeklyTabs)
      const tabsPerDose = Math.round((wTabs / 2) * 10) / 10
      const dosePerDay = Math.round((wTabs * selectedDrug.concentration / 2) * 10) / 10
      preview = `每週 ${wTabs} 顆 → Day1 ${tabsPerDose}顆 (${dosePerDay}${doseUnit}) + Day4 ${tabsPerDose}顆 (${dosePerDay}${doseUnit})`
    } else if (dailyDose) {
      const tabs = Math.round((parseFloat(dailyDose) / selectedDrug.concentration) * 10) / 10
      if (scheduleMode === 'eod') {
        preview = `隔日 ${dailyDose}${doseUnit} (${tabs} 顆/次，每週約 3.5 次)`
      } else {
        preview = `每日 ${dailyDose}${doseUnit} (${tabs} 顆/天)`
      }
    }
  }

  const isSplitWeekly = isOral && scheduleMode === 'split_weekly'
  const isOralCustom = isOral && (scheduleMode === 'custom_days' || scheduleMode === 'custom_interval')
  const isDisabled = !selectedDrugId
    || (isInjectable && injCustomOn && (!dailyDose || (injCustomKind === 'days' ? customDays.length === 0 : !(parseInt(intervalDays) >= 1))))
    || (isInjectable && !injCustomOn && !weeklyDose)
    || (isOralCustom && (!dailyDose || (scheduleMode === 'custom_days' ? customDays.length === 0 : !(parseInt(intervalDays) >= 1))))
    || (isOral && !isSplitWeekly && !isOralCustom && !dailyDose)
    || (isSplitWeekly && !weeklyTabs)
    || (isE3D && (!vialMl || !totalInjections))

  const existingDrugIds = existingCycleDrugs?.map(cd => cd.drug_id) || []

  // Inline weekday picker (fixed order: 一=1 .. 日=7)
  const dayPicker = (
    <div className="grid grid-cols-7 gap-1">
      {weekdayLabels.map((label, i) => {
        const dayNum = i + 1
        const selected = customDays.includes(dayNum)
        return (
          <Button
            key={dayNum}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            onClick={() =>
              setCustomDays((prev) =>
                prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
              )
            }
          >
            {label}
          </Button>
        )
      })}
    </div>
  )

  return (
    <>
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
                            {(() => {
                              const t = typeof window !== 'undefined' ? parseInt(localStorage.getItem('lowStockThreshold') ?? '') : NaN
                              const threshold = isNaN(t) ? 1 : t
                              return d.inventory_count <= threshold ? ' ⚠️' : ''
                            })()}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  })()}
                </SelectContent>
              </Select>
            </div>

            {selectedDrug && (
              <p className="text-sm text-muted-foreground">
                {selectedDrug.primary_category === 'Injectable'
                  ? `濃度: ${selectedDrug.concentration} ${selectedDrug.unit || 'mg/ml'}`
                  : `每顆: ${selectedDrug.concentration} ${selectedDrug.unit || 'mg/tab'}`}
              </p>
            )}

            {selectedDrugId && existingDrugIds.includes(selectedDrugId) && (
              <p className="text-xs text-muted-foreground">
                此藥物已在課表中。可重複新增不同週數/劑量（適用於 PCT 漸減劑量等情境）。
              </p>
            )}

            {isInjectable && (
              <>
                {injCustomOn ? (
                  <div className="space-y-2">
                    <Label>每次劑量 ({doseUnit}/次) *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={dailyDose}
                      onChange={(e) => setDailyDose(e.target.value)}
                      placeholder="e.g. 100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>每週劑量 ({doseUnit}/週) *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={weeklyDose}
                      onChange={(e) => setWeeklyDose(e.target.value)}
                      placeholder="e.g. 360"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch checked={injCustomOn} onCheckedChange={(checked: boolean) => setInjCustomOn(checked)} />
                  <Label>自訂使用頻率</Label>
                </div>
                {injCustomOn && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={injCustomKind === 'days' ? 'default' : 'outline'}
                        onClick={() => setInjCustomKind('days')}
                      >
                        指定星期幾
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={injCustomKind === 'interval' ? 'default' : 'outline'}
                        onClick={() => setInjCustomKind('interval')}
                      >
                        每 N 天
                      </Button>
                    </div>
                    {injCustomKind === 'days' ? (
                      <div className="space-y-2">
                        <Label>選擇星期幾 *</Label>
                        {dayPicker}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>每 N 天注射一次 *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {isE3D && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>每瓶 (ml) *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={vialMl}
                      onChange={(e) => setVialMl(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>瓶數 *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={vialCount}
                      onChange={(e) => setVialCount(e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>總注射次數 *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={totalInjections}
                      onChange={(e) => setTotalInjections(e.target.value)}
                      placeholder="e.g. 3"
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
              <>
                <div className="space-y-2">
                  <Label>排程模式</Label>
                  <Select value={scheduleMode} onValueChange={(v: string | null) => v && setScheduleMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每日</SelectItem>
                      <SelectItem value="eod">隔日 (EOD)</SelectItem>
                      <SelectItem value="split_weekly">每週固定天 (Day1 & Day4)</SelectItem>
                      <SelectItem value="custom_days">指定星期幾</SelectItem>
                      <SelectItem value="custom_interval">每 N 天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scheduleMode === 'split_weekly' ? (
                  <div className="space-y-2">
                    <Label>每週顆數 *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={weeklyTabs}
                      onChange={(e) => setWeeklyTabs(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                ) : scheduleMode === 'custom_days' || scheduleMode === 'custom_interval' ? (
                  <>
                    {scheduleMode === 'custom_days' ? (
                      <div className="space-y-2">
                        <Label>選擇星期幾 *</Label>
                        {dayPicker}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>每 N 天服用一次 *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>每次劑量 ({doseUnit}) *</Label>
                      <Input
                        type="number"
                        step="any"
                        value={dailyDose}
                        onChange={(e) => setDailyDose(e.target.value)}
                        placeholder="e.g. 0.5"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>{scheduleMode === 'eod' ? `每次劑量 (${doseUnit})` : `每日劑量 (${doseUnit}/天)`} *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={dailyDose}
                      onChange={(e) => setDailyDose(e.target.value)}
                      placeholder="e.g. 0.5"
                    />
                  </div>
                )}
              </>
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

      {/* Overlap confirmation dialog */}
      <Dialog open={overlapDialogOpen} onOpenChange={handleCancelOverlap}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>週數重疊</DialogTitle>
            <DialogDescription>
              此藥物在以下週數已有排程，是否取代重疊的部分？
            </DialogDescription>
          </DialogHeader>
          {pendingOps && (
            <div className="space-y-2 text-sm">
              {pendingOps.toRemove.length > 0 && (
                <p>將移除：{pendingOps.toRemove.map(id => {
                  const cd = existingCycleDrugs?.find(c => c.id === id)
                  return cd ? `W${cd.start_week}-${cd.end_week}` : id
                }).join('、')}</p>
              )}
              {pendingOps.toUpdate.length > 0 && (
                <p>將調整：{pendingOps.toUpdate.map(u => {
                  const cd = existingCycleDrugs?.find(c => c.id === u.id)
                  const oldRange = cd ? `W${cd.start_week}-${cd.end_week}` : ''
                  const newStart = u.start_week ?? cd?.start_week
                  const newEnd = u.end_week ?? cd?.end_week
                  return `${oldRange} → W${newStart}-${newEnd}`
                }).join('、')}</p>
              )}
              {pendingOps.toCreate.length > 0 && (
                <p>將保留分割：{pendingOps.toCreate.map(c => `W${c.start_week}-${c.end_week}`).join('、')}</p>
              )}
              <p className="font-medium">新排程：W{pendingOps.newData.start_week}-{pendingOps.newData.end_week}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelOverlap}>取消</Button>
            <Button onClick={handleConfirmReplace}>取代</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Compute overlap resolution operations for same-drug entries.
 * 4 cases: full cover → delete, front overlap → trim start, back overlap → trim end,
 * middle split → trim end + create new tail entry.
 */
function computeOverlapOps(overlapping: ExistingCycleDrug[], newData: AddData): OverlapReplaceOps {
  const toRemove: string[] = []
  const toUpdate: Array<{ id: string; start_week?: number; end_week?: number }> = []
  const toCreate: AddData[] = []

  for (const existing of overlapping) {
    const newStart = newData.start_week
    const newEnd = newData.end_week
    const exStart = existing.start_week
    const exEnd = existing.end_week

    if (newStart <= exStart && newEnd >= exEnd) {
      // Full cover: new completely covers existing → delete
      toRemove.push(existing.id)
    } else if (newStart <= exStart && newEnd < exEnd) {
      // Front overlap: trim existing start
      toUpdate.push({ id: existing.id, start_week: newEnd + 1 })
    } else if (newStart > exStart && newEnd >= exEnd) {
      // Back overlap: trim existing end
      toUpdate.push({ id: existing.id, end_week: newStart - 1 })
    } else if (newStart > exStart && newEnd < exEnd) {
      // Middle split: trim existing end, create tail
      toUpdate.push({ id: existing.id, end_week: newStart - 1 })
      toCreate.push({
        drug_id: existing.drug_id,
        weekly_dose: existing.weekly_dose || undefined,
        daily_dose: existing.daily_dose || undefined,
        injection_ml: existing.injection_ml || undefined,
        total_injections: existing.total_injections || undefined,
        schedule_mode: existing.schedule_mode || undefined,
        custom_days: existing.custom_days || undefined,
        interval_days: existing.interval_days || undefined,
        start_week: newEnd + 1,
        end_week: exEnd,
      })
    }
  }

  return { toRemove, toUpdate, toCreate, newData }
}
