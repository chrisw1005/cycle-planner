'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUpdateCycleStatus, useCompleteCycleShipment, useRevertCycleShipment } from '@/hooks/use-cycles'
import { computeShipmentItems } from '@/lib/calculations/shipment'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { statusColors, statusLabels } from '@/lib/constants/cycle-status'
import { toast } from 'sonner'
import type { CycleStatus, Drug } from '@/types'

const supabase = createClient()

interface CycleStatusSelectProps {
  cycle: { id: string; status: CycleStatus }
  allDrugs: Drug[]
}

/**
 * Inline cycle-status switcher for list views (課表管理 / 人物詳情). Reuses the same
 * shipment deduction + revert flow as the detail page. Moving to/from Completed
 * touches inventory, so it asks for confirmation first. Archived cycles are read-only.
 */
export function CycleStatusSelect({ cycle, allDrugs }: CycleStatusSelectProps) {
  const updateStatus = useUpdateCycleStatus()
  const completeCycle = useCompleteCycleShipment()
  const revertCycle = useRevertCycleShipment()
  const [pending, setPending] = useState<CycleStatus | null>(null)
  const [busy, setBusy] = useState(false)

  if (cycle.status === 'Archived') {
    return (
      <Badge variant="outline" className={statusColors.Archived}>
        {statusLabels.Archived}
      </Badge>
    )
  }

  // Moving to Completed (shipment) or away from Completed (revert) changes stock.
  const touchesInventory = (next: CycleStatus) =>
    next === 'Completed' || (cycle.status === 'Completed' && next !== 'Archived')

  const handleSelect = (next: CycleStatus) => {
    if (next === cycle.status) return
    if (touchesInventory(next)) {
      setPending(next)
    } else {
      updateStatus.mutate({ id: cycle.id, status: next })
    }
  }

  const confirm = async () => {
    if (!pending) return
    const next = pending
    setBusy(true)
    try {
      if (next === 'Completed') {
        const [cdRes, cellRes] = await Promise.all([
          supabase
            .from('cycle_drugs')
            .select('*, drug:drugs(id, name, concentration, primary_category, sub_category, ester_type, inventory_count, tabs_per_box, package_unit, template_id)')
            .eq('cycle_id', cycle.id),
          supabase.from('cycle_cells').select('*').eq('cycle_id', cycle.id),
        ])
        if (cdRes.error) throw cdRes.error
        if (cellRes.error) throw cellRes.error
        const items = computeShipmentItems((cdRes.data || []) as any, (cellRes.data || []) as any, allDrugs)
        await new Promise<void>((resolve, reject) =>
          completeCycle.mutate({ id: cycle.id, items }, { onSuccess: () => resolve(), onError: reject }),
        )
      } else {
        await new Promise<void>((resolve, reject) =>
          revertCycle.mutate({ id: cycle.id, status: next }, { onSuccess: () => resolve(), onError: reject }),
        )
      }
      setPending(null)
    } catch (err) {
      toast.error('狀態更新失敗', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Select value={cycle.status} onValueChange={(v: string | null) => v && handleSelect(v as CycleStatus)}>
        <SelectTrigger className={cn('h-8 w-28', statusColors[cycle.status])}>
          <SelectValue>
            {(value: string | null) => (value ? statusLabels[value as CycleStatus] ?? value : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Planned">排制中</SelectItem>
          <SelectItem value="Testing">測試中</SelectItem>
          <SelectItem value="Completed">已完成</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending === 'Completed' ? '標記為已完成（出貨）' : '還原庫存'}</DialogTitle>
            <DialogDescription>
              {pending === 'Completed'
                ? '將課表標記為「已完成」＝出貨，會自動扣除對應藥品的現有庫存並寫入庫存異動紀錄。確定要繼續嗎？'
                : `將已完成課表改為「${pending ? statusLabels[pending] : ''}」會還原先前出貨扣除的庫存。確定要繼續嗎？`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
              取消
            </Button>
            <Button onClick={confirm} disabled={busy}>
              {busy ? '處理中...' : '確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
