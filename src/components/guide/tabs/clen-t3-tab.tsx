'use client'

import {
  clenProtocols,
  t3Protocols,
  clenT3StackProtocol,
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

export function ClenT3Tab() {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Clenbuterol */}
        {clenProtocols.map((protocol, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              Clenbuterol
              <Badge variant="secondary">{protocol.name}</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">{protocol.description}</p>

            <div className="space-y-1">
              <p className="text-sm font-medium">劑量範圍：</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>性別</TableHead>
                    <TableHead>起始劑量</TableHead>
                    <TableHead>最高劑量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.dosageRange.map((d, j) => (
                    <TableRow key={j}>
                      <TableCell className="font-medium">{d.gender}</TableCell>
                      <TableCell>{d.start}</TableCell>
                      <TableCell>{d.max}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">週期安排：</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {protocol.schedule.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">副作用：</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {protocol.sideEffects.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            </div>

            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {protocol.notes.map((n, j) => (
                <li key={j}>{n}</li>
              ))}
            </ul>
          </div>
        ))}

        {/* T3 */}
        {t3Protocols.map((protocol, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              T3 (Liothyronine)
              <Badge variant="secondary">{protocol.name}</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">{protocol.description}</p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>階段</TableHead>
                  <TableHead>說明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">劑量範圍</TableCell>
                  <TableCell>{protocol.dosageRange}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">遞增期</TableCell>
                  <TableCell>{protocol.rampUp}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">維持期</TableCell>
                  <TableCell>{protocol.maintain}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">遞減期</TableCell>
                  <TableCell>{protocol.taperDown}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">總時長</TableCell>
                  <TableCell>{protocol.duration}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">重要警告</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {protocol.notes.map((n, j) => (
                  <li key={j}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {/* Clen + T3 Stack */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <h3 className="font-medium">{clenT3StackProtocol.title}</h3>
          <p className="text-sm text-muted-foreground">{clenT3StackProtocol.description}</p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>週數</TableHead>
                <TableHead>Clenbuterol</TableHead>
                <TableHead>T3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clenT3StackProtocol.schedule.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.weeks}</TableCell>
                  <TableCell>{s.clen}</TableCell>
                  <TableCell>{s.t3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
            {clenT3StackProtocol.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  )
}
