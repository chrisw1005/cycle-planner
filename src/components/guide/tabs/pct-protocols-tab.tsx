'use client'

import {
  pctTimingTable,
  pctProtocols,
  hcgOnCycleProtocol,
} from '@/lib/data/drug-guide'
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

export function PCTProtocolsTab() {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* PCT Timing */}
        <div className="space-y-2">
          <h3 className="font-medium">PCT 開始時機（最後一針後等待時間）</h3>
          <p className="text-xs text-muted-foreground">經驗法則：最後一針後等待約 5 個半衰期再開始 PCT</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>化合物</TableHead>
                <TableHead>等待時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pctTimingTable.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{entry.compound}</TableCell>
                  <TableCell>{entry.waitTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* PCT Protocols */}
        {pctProtocols.map((protocol, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{protocol.name}</h3>
              <Badge variant="secondary">{protocol.suitability}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>藥物</TableHead>
                  <TableHead>劑量</TableHead>
                  <TableHead>時長</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocol.drugs.map((drug, j) => (
                  <TableRow key={j}>
                    <TableCell className="font-medium">{drug.name}</TableCell>
                    <TableCell>{drug.dosage}</TableCell>
                    <TableCell>{drug.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {protocol.notes.map((note, k) => (
                <li key={k}>{note}</li>
              ))}
            </ul>
          </div>
        ))}

        {/* HCG On-Cycle */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <h3 className="font-medium">{hcgOnCycleProtocol.title}</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">劑量：</span>{hcgOnCycleProtocol.dosage}</p>
            <p><span className="font-medium">時機：</span>{hcgOnCycleProtocol.timing}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">好處：</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {hcgOnCycleProtocol.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">警告：</p>
            <ul className="list-disc list-inside text-sm text-destructive/80 space-y-0.5">
              {hcgOnCycleProtocol.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">重要提醒：</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {hcgOnCycleProtocol.importantNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
