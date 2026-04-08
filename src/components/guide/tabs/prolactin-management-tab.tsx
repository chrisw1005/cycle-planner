'use client'

import { prolactinProtocols, prolactinKeyPoints } from '@/lib/data/drug-guide'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ProlactinManagementTab() {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Key points */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h3 className="font-medium">重要須知</h3>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {prolactinKeyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        {/* Protocol cards */}
        {prolactinProtocols.map((protocol, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-medium">{protocol.drug}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>類型</TableHead>
                  <TableHead>劑量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">預防劑量</TableCell>
                  <TableCell>{protocol.preventiveDose}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">治療劑量</TableCell>
                  <TableCell>{protocol.therapeuticDose}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">最大劑量</TableCell>
                  <TableCell>{protocol.maxDose}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">半衰期</TableCell>
                  <TableCell>{protocol.halfLife}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {protocol.notes.map((note, j) => (
                <li key={j}>{note}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
