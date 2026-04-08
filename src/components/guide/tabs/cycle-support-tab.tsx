'use client'

import { cycleSupplements, minimumCycleSupport } from '@/lib/data/drug-guide'
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

export function CycleSupportTab() {
  const categories = [...new Set(cycleSupplements.map((s) => s.category))]

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Minimum stack */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <h3 className="font-medium">任何週期的最低輔助需求</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead>劑量</TableHead>
                <TableHead>說明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {minimumCycleSupport.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.dosage}</TableCell>
                  <TableCell className="text-muted-foreground">{item.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Full supplement list by category */}
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              {category}
              <Badge variant="secondary">{cycleSupplements.filter((s) => s.category === category).length} 項</Badge>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>劑量</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead>使用時機</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleSupplements
                  .filter((s) => s.category === category)
                  .map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.dosage}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.purpose}</TableCell>
                      <TableCell className="text-xs">{s.when}</TableCell>
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
