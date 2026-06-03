'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { exportDeficitsToXLSX, exportDeficitsToPDF } from '@/lib/export/deficit-export'
import { InventoryBatchEditDialog } from './inventory-batch-edit-dialog'
import { FileSpreadsheet, FileText, PencilLine } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import type { DrugInventoryDelta, Drug } from '@/types'

interface DeficitActionsProps {
  deficits: DrugInventoryDelta[]
  allDrugs: Drug[]
}

export function DeficitActions({ deficits, allDrugs }: DeficitActionsProps) {
  const { isAdmin } = useAuth()
  const [batchOpen, setBatchOpen] = useState(false)
  const [includeRemainder, setIncludeRemainder] = useState(false)

  const hasShortage = deficits.some((d) => d.deficit < 0)
  if (!hasShortage) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => exportDeficitsToXLSX(deficits, includeRemainder)}>
        <FileSpreadsheet className="mr-1.5 h-4 w-4" />
        匯出 XLSX
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportDeficitsToPDF(deficits, includeRemainder)}>
        <FileText className="mr-1.5 h-4 w-4" />
        匯出 PDF
      </Button>
      <div className="flex items-center gap-1.5">
        <Switch id="include-remainder" checked={includeRemainder} onCheckedChange={(checked: boolean) => setIncludeRemainder(checked)} />
        <Label htmlFor="include-remainder" className="text-sm text-muted-foreground">匯出含餘數</Label>
      </div>
      {isAdmin && (
        <>
          <Button variant="outline" size="sm" onClick={() => setBatchOpen(true)}>
            <PencilLine className="mr-1.5 h-4 w-4" />
            批次更新庫存
          </Button>
          <InventoryBatchEditDialog
            open={batchOpen}
            onOpenChange={setBatchOpen}
            deficits={deficits}
            allDrugs={allDrugs}
          />
        </>
      )}
    </div>
  )
}
