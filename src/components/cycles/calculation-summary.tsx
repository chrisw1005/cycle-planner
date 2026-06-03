'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatOralInventory, groupDeltasByCategory } from '@/lib/utils'
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
                <TableHead className="text-right">現有庫存</TableHead>
                <TableHead className="text-right">差異</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupDeltasByCategory(deltas).map((group) => (
                <React.Fragment key={group.category}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="text-center font-semibold text-muted-foreground py-1.5">
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.items.map((d) => {
                    const isE3D = d.ester_type === 'E3D'
                    const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
                    const unitLabel = isOral ? '盒' : isE3D ? '瓶/劑' : '瓶'
                    return (
                      <TableRow key={d.drug_id}>
                        <TableCell className="font-medium">{d.drug_name}</TableCell>
                        <TableCell className="text-right">
                          {isOral
                            ? `${Math.round(d.needed_ml)} 顆 (${formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box, d.package_unit ?? '盒')})`
                            : isE3D
                              ? `${d.needed_vials} 瓶/劑`
                              : `${d.needed_ml} ml (${d.needed_vials} 瓶)`}
                        </TableCell>
                        <TableCell className="text-right">
                          {isOral
                            ? `${formatOralInventory(d.current_inventory, d.tabs_per_box, d.package_unit ?? '盒')}（${d.current_inventory}顆）`
                            : `${d.current_inventory} ${unitLabel}`}
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
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
