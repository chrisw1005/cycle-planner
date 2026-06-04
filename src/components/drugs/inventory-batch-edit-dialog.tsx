'use client'

import { useMemo, useRef, useState } from 'react'
import { useBatchUpdateDrugInventory } from '@/hooks/use-drugs'
import { parseDeficitXLSX } from '@/lib/import/deficit-import'
import { oralDeficitPackages } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DrugInventoryDelta, Drug } from '@/types'

interface InventoryBatchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deficits: DrugInventoryDelta[]
  allDrugs: Drug[]
}

export function InventoryBatchEditDialog({
  open, onOpenChange, deficits, allDrugs,
}: InventoryBatchEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchUpdate = useBatchUpdateDrugInventory()

  const shortage = useMemo(() => deficits.filter((d) => d.deficit < 0), [deficits])

  const [values, setValues] = useState<Record<string, string>>({})

  const setValue = (drugId: string, v: string) =>
    setValues((prev) => ({ ...prev, [drugId]: v }))

  const autoFillPatch = () => {
    const next: Record<string, string> = {}
    for (const d of shortage) {
      next[d.drug_id] = String(d.current_inventory + Math.abs(d.deficit))
    }
    setValues(next)
    toast.success('已自動填入「剛好補平」數量')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await parseDeficitXLSX(file, allDrugs)
      const next: Record<string, string> = { ...values }
      for (const r of result.rows) next[r.drug_id] = String(r.new_inventory)
      setValues(next)
      const msgs: string[] = [`匯入 ${result.rows.length} 筆`]
      if (result.skipped > 0) msgs.push(`跳過 ${result.skipped} 筆空白`)
      if (result.unmatched.length > 0) msgs.push(`${result.unmatched.length} 筆無法比對`)
      toast.success(msgs.join('，'))
      if (result.unmatched.length > 0) {
        console.warn('Unmatched rows:', result.unmatched)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('匯入失敗', { description: msg })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    const updates = Object.entries(values)
      .map(([id, v]) => ({
        id,
        inventory_count: parseInt(v, 10),
        previous: allDrugs.find((d) => d.id === id)?.inventory_count,
      }))
      .filter((u) => Number.isFinite(u.inventory_count) && u.inventory_count >= 0)
    if (updates.length === 0) {
      toast.error('沒有有效的更新')
      return
    }
    batchUpdate.mutate(updates, {
      onSuccess: () => {
        setValues({})
        onOpenChange(false)
      },
    })
  }

  const dirtyCount = Object.values(values).filter((v) => v !== '').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>批次更新庫存（缺口）</DialogTitle>
          <DialogDescription>
            填寫每項藥物的新庫存絕對值，或從 XLSX 匯入。空白列將被略過。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            匯入 XLSX
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={autoFillPatch}>
            <Wand2 className="mr-1.5 h-4 w-4" />
            自動填「剛好補平」
          </Button>
          <span className="ml-auto text-sm text-muted-foreground">
            已填 {dirtyCount} / {shortage.length}
          </span>
        </div>

        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>藥物</TableHead>
                <TableHead className="text-right">現有</TableHead>
                <TableHead className="text-right">需求</TableHead>
                <TableHead className="text-right">缺口</TableHead>
                <TableHead className="w-28">新庫存</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortage.map((d) => {
                const isE3D = d.ester_type === 'E3D'
                const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT' || d.category === 'Other')
                const unit = isOral ? '顆' : isE3D ? '瓶/劑' : '瓶'
                const needed = isOral ? Math.round(d.needed_ml) : d.needed_vials
                const shortage = isOral
                  ? `缺 ${oralDeficitPackages(d.deficit, d.tabs_per_box)} ${d.package_unit ?? '盒'}`
                  : `缺 ${Math.abs(d.deficit)} ${unit}`
                return (
                  <TableRow key={d.drug_id}>
                    <TableCell className="font-medium">{d.drug_name}</TableCell>
                    <TableCell className="text-right">{d.current_inventory} {unit}</TableCell>
                    <TableCell className="text-right">{needed} {unit}</TableCell>
                    <TableCell className="text-right text-red-500">
                      {shortage}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={values[d.drug_id] ?? ''}
                        placeholder="—"
                        onChange={(e) => setValue(d.drug_id, e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={batchUpdate.isPending || dirtyCount === 0}
          >
            {batchUpdate.isPending ? '更新中...' : `更新 ${dirtyCount} 項`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
