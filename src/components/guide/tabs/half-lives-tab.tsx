'use client'

import { halfLifeTable } from '@/lib/data/drug-guide'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function HalfLivesTab() {
  const categories = [...new Set(halfLifeTable.map((h) => h.category))]

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        <p className="text-sm text-muted-foreground">
          半衰期決定注射頻率和 PCT 開始時機。經驗法則：最後一針後等待約 5 個半衰期再開始 PCT。
        </p>

        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              {category}
              <Badge variant="secondary">
                {halfLifeTable.filter((h) => h.category === category).length}
              </Badge>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>化合物</TableHead>
                  <TableHead>半衰期</TableHead>
                  <TableHead>建議頻率</TableHead>
                  <TableHead>PCT 等待</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {halfLifeTable
                  .filter((h) => h.category === category)
                  .map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{h.compound}</TableCell>
                      <TableCell>{h.halfLife}</TableCell>
                      <TableCell>{h.frequency}</TableCell>
                      <TableCell>{h.pctWait}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
