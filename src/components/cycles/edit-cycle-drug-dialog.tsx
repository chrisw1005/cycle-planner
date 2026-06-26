'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDoseUnit } from '@/lib/utils'

export interface EditableCycleDrug {
  id: string
  drug_id: string
  start_week: number
  end_week: number
  weekly_dose?: number | null
  daily_dose?: number | null
  injection_ml?: number | null
  total_injections?: number | null
  schedule_mode?: string | null
  drug?: { name?: string; unit?: string | null } | null
}

export interface CycleDrugUpdate {
  id: string
  start_week: number
  end_week: number
  weekly_dose?: number
  daily_dose?: number
  injection_ml?: number
  total_injections?: number
}

interface EditCycleDrugDialogProps {
  open: boolean
  onClose: () => void
  cycleDrug: EditableCycleDrug | null
  totalWeeks: number
  onSave: (updates: CycleDrugUpdate) => void
}

type DoseKind = 'injection' | 'weekly' | 'daily'

function doseKindOf(cd: EditableCycleDrug): DoseKind {
  if (cd.injection_ml != null) return 'injection'
  if (cd.weekly_dose != null) return 'weekly'
  return 'daily'
}

// daily_dose holds a PER-ADMINISTRATION amount (not a daily amount) for these
// schedule modes — mirror the add flow's "每次劑量" labeling (drug-selector).
function isPerAdministration(scheduleMode?: string | null): boolean {
  return scheduleMode === 'eod' || scheduleMode === 'custom_days' || scheduleMode === 'custom_interval'
}

// E3D injectables are placed every 3rd day for `total_injections` shots; the
// end week is derived, not user-set — same formula as the add flow.
function deriveInjectionEndWeek(startWeek: number, totalInjections: number): number {
  const absStart = (startWeek - 1) * 7 + 1
  const absLastDay = absStart + (totalInjections - 1) * 3
  return Math.ceil(absLastDay / 7)
}

function initialForm(cd: EditableCycleDrug | null) {
  if (!cd) return { dose: '', injections: '', startWeek: '1', endWeek: '1' }
  const kind = doseKindOf(cd)
  const dose = kind === 'injection' ? cd.injection_ml : kind === 'weekly' ? cd.weekly_dose : cd.daily_dose
  return {
    dose: dose != null ? String(dose) : '',
    injections: cd.total_injections != null ? String(cd.total_injections) : '',
    startWeek: String(cd.start_week),
    endWeek: String(cd.end_week),
  }
}

/**
 * Edit dose + week range of an existing cycle_drug entry. Keep this dialog
 * remounted via a `key` on the parent (keyed by the entry id) so the lazy
 * useState initializers below re-read the freshly selected entry — no effect
 * needed to sync props into state.
 */
export function EditCycleDrugDialog({ open, onClose, cycleDrug, totalWeeks, onSave }: EditCycleDrugDialogProps) {
  const [dose, setDose] = useState(() => initialForm(cycleDrug).dose)
  const [injections, setInjections] = useState(() => initialForm(cycleDrug).injections)
  const [startWeek, setStartWeek] = useState(() => initialForm(cycleDrug).startWeek)
  const [endWeek, setEndWeek] = useState(() => initialForm(cycleDrug).endWeek)

  if (!cycleDrug) return null

  const kind = doseKindOf(cycleDrug)
  const doseUnit = getDoseUnit(cycleDrug.drug?.unit)
  const doseLabel =
    kind === 'injection'
      ? '每次注射 (ml) *'
      : kind === 'weekly'
        ? `每週劑量 (${doseUnit}/週) *`
        : isPerAdministration(cycleDrug.schedule_mode)
          ? `每次劑量 (${doseUnit}/次) *`
          : `每日劑量 (${doseUnit}/天) *`

  const start = parseInt(startWeek)
  const end = parseInt(endWeek)
  const injCount = parseInt(injections)
  const doseValue = parseFloat(dose)

  // E3D end week is auto-derived from start + injection count.
  const derivedInjectionEnd =
    kind === 'injection' && start >= 1 && injCount >= 1 ? deriveInjectionEndWeek(start, injCount) : null

  const isDisabled =
    !(doseValue > 0) ||
    !(start >= 1) ||
    (kind === 'injection' ? !(injCount >= 1) : !(end >= start))

  const handleSave = () => {
    if (isDisabled) return
    const updates: CycleDrugUpdate = { id: cycleDrug.id, start_week: start, end_week: end }
    if (kind === 'injection') {
      updates.injection_ml = doseValue
      updates.total_injections = injCount
      updates.end_week = derivedInjectionEnd ?? end
    } else if (kind === 'weekly') {
      updates.weekly_dose = doseValue
    } else {
      updates.daily_dose = doseValue
    }
    onSave(updates)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>編輯 {cycleDrug.drug?.name ?? '藥物'} 排程</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{doseLabel}</Label>
            <Input
              type="number"
              step="any"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="e.g. 0.5"
            />
          </div>

          {kind === 'injection' && (
            <div className="space-y-2">
              <Label>總注射次數 *</Label>
              <Input
                type="number"
                min="1"
                value={injections}
                onChange={(e) => setInjections(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          )}

          {kind === 'injection' ? (
            <div className="space-y-2">
              <Label>開始週</Label>
              <Input
                type="number"
                min="1"
                max={totalWeeks}
                value={startWeek}
                onChange={(e) => setStartWeek(e.target.value)}
              />
              {derivedInjectionEnd && (
                <p className="text-xs text-muted-foreground">
                  結束週由注射次數自動計算：第 {start}–{derivedInjectionEnd} 週
                </p>
              )}
            </div>
          ) : (
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
                  value={endWeek}
                  onChange={(e) => setEndWeek(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={isDisabled}>儲存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
