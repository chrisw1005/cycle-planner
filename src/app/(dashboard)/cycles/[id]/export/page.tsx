'use client'

import React, { use, useMemo } from 'react'
import { useCycle, useCycleCells, useCycles, useUpdateCycleStatus } from '@/hooks/use-cycles'
import { useDrugs } from '@/hooks/use-drugs'
import { generateAllCells } from '@/lib/calculations/schedule-engine'
import { calculateInventoryDeltas } from '@/lib/calculations/vial-calculator'
import { exportScheduleToXLSX } from '@/lib/export/xlsx-export'
import { exportScheduleToPDF } from '@/lib/export/pdf-export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatOralInventory, getDayLabels, groupDeltasByCategory } from '@/lib/utils'
import type { CycleCell } from '@/types'


export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cycle, isLoading } = useCycle(id)
  const { data: allCycles } = useCycles()
  const { data: savedCells } = useCycleCells(id)
  const { data: allDrugs } = useDrugs()
  const updateStatus = useUpdateCycleStatus()

  // Generate display cells
  const displayCells: CycleCell[] = useMemo(() => {
    if (!cycle?.cycle_drugs) return []

    // Use saved cells if available, otherwise generate
    if (savedCells && savedCells.length > 0) return savedCells

    const overrides = savedCells?.filter((c) => c.is_manual_override || c.is_skipped) || []
    const generated = generateAllCells(cycle.cycle_drugs as any, cycle.total_weeks, overrides)
    return generated.map((cell, i) => ({
      id: `gen-${i}`,
      cycle_id: id,
      cycle_drug_id: cell.cycle_drug_id,
      week_number: cell.week_number,
      day_of_week: cell.day_of_week,
      display_value: cell.display_value,
      ml_amount: cell.ml_amount,
      is_manual_override: cell.is_manual_override,
      is_skipped: cell.is_skipped ?? false,
      created_at: '',
    }))
  }, [cycle, savedCells, id])

  // Drug inventory deltas
  const inventoryDeltas = useMemo(() => {
    if (!cycle?.cycle_drugs) return []
    return calculateInventoryDeltas(cycle.cycle_drugs as any, allDrugs as any)
  }, [cycle, allDrugs])

  // Cell map for preview
  const cellMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const cell of displayCells) {
      const key = `${cell.week_number}-${cell.day_of_week}`
      if (!map.has(key)) map.set(key, [])
      if (cell.display_value) map.get(key)!.push(cell.display_value)
    }
    return map
  }, [displayCells])

  const promptArchive = () => {
    if (!cycle || cycle.status === 'Archived') return
    toast.success('匯出成功', {
      description: '是否將此課表封存？',
      action: {
        label: '封存',
        onClick: () => updateStatus.mutate({ id, status: 'Archived' }),
      },
      duration: 6000,
    })
  }

  const handleXLSXExport = () => {
    if (!cycle) return
    const personName = (cycle as any).person?.nickname || 'Unknown'
    exportScheduleToXLSX(
      cycle.name || `${personName} Cycle`,
      personName,
      cycle.total_weeks,
      displayCells,
      inventoryDeltas
    )
    promptArchive()
  }

  const handlePDFExport = () => {
    if (!cycle) return
    const personName = (cycle as any).person?.nickname || 'Unknown'
    const personCycles = allCycles
      ?.filter((c) => c.person_id === cycle.person_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
    const idx = personCycles.findIndex((c) => c.id === cycle.id) + 1
    const cycleNum = idx > 0 ? idx : 1
    let endDateStr = ''
    if (cycle.start_date) {
      const end = new Date(cycle.start_date)
      end.setDate(end.getDate() + cycle.total_weeks * 7)
      endDateStr = ` (${end.getFullYear()}/${String(end.getMonth() + 1).padStart(2, '0')})`
    }
    const title = `${personName} - Cycle ${cycleNum}${endDateStr}`
    exportScheduleToPDF(title, cycle.total_weeks, displayCells, inventoryDeltas)
    promptArchive()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>
  }
  if (!cycle) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">找不到課表</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href={`/cycles/${id}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">匯出課表</h1>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleXLSXExport} size="lg">
          <FileSpreadsheet className="mr-2 h-5 w-5" />
          匯出 XLSX
        </Button>
        <Button onClick={handlePDFExport} size="lg" variant="outline">
          <FileText className="mr-2 h-5 w-5" />
          匯出 PDF
        </Button>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">預覽</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border px-3 py-2 bg-muted text-left font-medium">Week</th>
                {getDayLabels(cycle?.start_date).map((day, i) => (
                  <th key={i} className="border border-border px-3 py-2 bg-muted text-center font-medium min-w-[120px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cycle.total_weeks }, (_, weekIdx) => {
                const weekNum = weekIdx + 1
                return (
                  <tr key={weekNum}>
                    <td className="border border-border px-3 py-2 font-medium text-muted-foreground bg-muted/50">
                      Week {weekNum}
                    </td>
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const dayNum = dayIdx + 1
                      const entries = cellMap.get(`${weekNum}-${dayNum}`) || []
                      return (
                        <td key={dayNum} className="border border-border px-2 py-1.5 align-top text-xs">
                          {entries.map((entry, i) => {
                            const match = entry.match(/^(.+?)\s+(\d[\d.]*\s*(?:ml|mg|IU|mcg).*)$/i)
                            return match ? (
                              <div key={i} className="leading-tight flex justify-between gap-2">
                                <span>{match[1]}</span>
                                <span className="text-muted-foreground">{match[2]}</span>
                              </div>
                            ) : (
                              <div key={i} className="leading-tight">{entry}</div>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Drug Stats (simplified for export) */}
      {inventoryDeltas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">藥物用量統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>藥物</TableHead>
                    <TableHead className="text-right">需求量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupDeltasByCategory(inventoryDeltas).map((group) => (
                    <React.Fragment key={group.category}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="text-center font-semibold text-muted-foreground py-1.5">
                          {group.label}
                        </TableCell>
                      </TableRow>
                      {group.items.map((d) => {
                        const isE3D = d.ester_type === 'E3D'
                        const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
                        return (
                          <TableRow key={d.drug_id}>
                            <TableCell className="font-medium">{d.drug_name}</TableCell>
                            <TableCell className="text-right">
                              {isOral
                                ? `${Math.round(d.needed_ml)} 顆 (${formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box)})`
                                : isE3D
                                  ? `${d.needed_vials} 瓶/劑`
                                  : `${d.needed_ml} ml (${d.needed_vials} 瓶)`}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
