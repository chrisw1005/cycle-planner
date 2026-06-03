'use client'

import { useState } from 'react'
import { useSaveAsTemplate } from '@/hooks/use-templates'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDoseUnit } from '@/lib/utils'
import type { CycleDrug, Drug } from '@/types'

interface CycleDrugWithDrug extends CycleDrug {
  drug: Drug
}

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleName: string | null
  cycleNotes: string | null
  totalWeeks: number
  cycleDrugs: CycleDrugWithDrug[]
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  cycleName,
  cycleNotes,
  totalWeeks,
  cycleDrugs,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const saveTemplate = useSaveAsTemplate()

  // Pre-fill when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(cycleName || '')
      setDescription(cycleNotes || '')
    }
    onOpenChange(v)
  }

  const handleSave = () => {
    if (!name.trim()) return
    saveTemplate.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        total_weeks: totalWeeks,
        drugs: cycleDrugs.map((cd) => ({
          drug_id: cd.drug_id,
          weekly_dose: cd.weekly_dose,
          daily_dose: cd.daily_dose,
          injection_ml: cd.injection_ml,
          total_injections: cd.total_injections,
          schedule_mode: cd.schedule_mode,
          custom_days: cd.custom_days,
          interval_days: cd.interval_days,
          start_week: cd.start_week,
          end_week: cd.end_week,
        })),
      },
      {
        onSuccess: () => handleOpenChange(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>儲存為模板</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">模板名稱 *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：增肌基礎 12 週"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">說明</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="模板說明..."
              rows={2}
            />
          </div>

          {/* Drug preview */}
          <div className="space-y-2">
            <Label>包含藥物 ({cycleDrugs.length})</Label>
            <div className="rounded-md border bg-muted/50 p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {cycleDrugs.map((cd) => (
                <div key={cd.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cd.drug?.name}</span>
                  <span className="text-muted-foreground">
                    {cd.injection_ml
                      ? `${cd.injection_ml}ml x ${cd.total_injections}`
                      : cd.weekly_dose
                        ? `${cd.weekly_dose}${getDoseUnit(cd.drug?.unit)}/wk`
                        : `${cd.daily_dose}${getDoseUnit(cd.drug?.unit)}/day`}
                    {' '}W{cd.start_week}-{cd.end_week}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saveTemplate.isPending}>
            {saveTemplate.isPending ? '儲存中...' : '儲存模板'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
