'use client'

import { cycleExamples } from '@/lib/data/drug-guide'
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

const levelColor = {
  '初級': 'default' as const,
  '初級+': 'default' as const,
  '中級': 'secondary' as const,
  '高級': 'destructive' as const,
}

export function CycleExamplesTab() {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {cycleExamples.map((cycle, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={levelColor[cycle.level]}>{cycle.level}</Badge>
              <h3 className="font-medium">{cycle.name}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{cycle.duration}</span>
            </div>
            <p className="text-sm text-muted-foreground">{cycle.goal}</p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>化合物</TableHead>
                  <TableHead>劑量</TableHead>
                  <TableHead>週數</TableHead>
                  <TableHead>頻率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycle.compounds.map((c, j) => (
                  <TableRow key={j}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.dosage}</TableCell>
                    <TableCell>{c.weeks}</TableCell>
                    <TableCell>{c.frequency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1 text-sm">
              <p><span className="font-medium">AI：</span>{cycle.ai}</p>
              <p><span className="font-medium">PCT：</span>{cycle.pct}</p>
            </div>

            {cycle.notes.length > 0 && (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {cycle.notes.map((note, k) => (
                  <li key={k}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
