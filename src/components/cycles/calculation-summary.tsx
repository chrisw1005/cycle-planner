'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatOralInventory } from '@/lib/utils'
import type { DrugInventoryDelta } from '@/types'

interface CalculationSummaryProps {
  deltas: DrugInventoryDelta[]
}

export function CalculationSummary({ deltas }: CalculationSummaryProps) {
  if (deltas.length === 0) return null

  return (
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
                <TableHead className="text-right">需求數</TableHead>
                <TableHead className="text-right">現有庫存</TableHead>
                <TableHead className="text-right">差異</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deltas.map((d) => {
                const isOral = d.category === 'Oral' || d.category === 'PCT'
                return (
                  <TableRow key={d.drug_id}>
                    <TableCell className="font-medium">{d.drug_name}</TableCell>
                    <TableCell className="text-right">
                      {isOral ? `${Math.round(d.needed_ml)} 顆` : `${d.needed_ml} ml`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOral ? formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box) : `${d.needed_vials} 瓶`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOral
                        ? `${formatOralInventory(d.current_inventory, d.tabs_per_box)}（${d.current_inventory}顆）`
                        : `${d.current_inventory} 瓶`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          d.deficit >= 0
                            ? 'border-green-500 text-green-500'
                            : 'border-red-500 text-red-500'
                        }
                      >
                        {d.deficit >= 0 ? `+${d.deficit}` : d.deficit}
                        {isOral ? ' 顆' : ''}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
