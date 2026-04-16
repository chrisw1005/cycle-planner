'use client'

import { dosageRanges, bodyWeightGuidance, dosingStrategies, dosingStrategyKeyPoints } from '@/lib/data/drug-guide'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InfoTooltip } from '@/components/guide/info-tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DosageGuideTab() {
  const injectable = dosageRanges.filter((d) => d.category === '注射型')
  const oral = dosageRanges.filter((d) => d.category === '口服')

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Body weight guidance */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">{bodyWeightGuidance.title}</h3>
          <p className="text-sm text-muted-foreground">{bodyWeightGuidance.description}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>等級</TableHead>
                <TableHead>mg/kg/週</TableHead>
                <TableHead>範例</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bodyWeightGuidance.ranges.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.level}</TableCell>
                  <TableCell>{r.mgPerKgPerWeek}</TableCell>
                  <TableCell className="text-muted-foreground">{r.example}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
            {bodyWeightGuidance.principles.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        {/* Dosing Strategies */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h3 className="font-medium">劑量策略選擇</h3>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {dosingStrategyKeyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        {dosingStrategies.map((strategy, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              {strategy.name}
              <Badge variant="secondary">{strategy.nameEn}</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">{strategy.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-500">優點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {strategy.advantages.map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">缺點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {strategy.disadvantages.map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              </div>
            </div>

            <p className="text-sm">
              <span className="font-medium">適合對象：</span>
              <span className="text-muted-foreground">{strategy.suitability}</span>
            </p>
            {strategy.example && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">範例：</span>{strategy.example}
              </p>
            )}
          </div>
        ))}

        {/* Injectable dosage table */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            注射型化合物
            <Badge variant="secondary">mg/週</Badge>
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>化合物</TableHead>
                <TableHead>初級</TableHead>
                <TableHead>中級</TableHead>
                <TableHead>高級</TableHead>
                <TableHead>備註</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {injectable.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.compound}</TableCell>
                  <TableCell>{d.beginner}</TableCell>
                  <TableCell>{d.intermediate}</TableCell>
                  <TableCell>{d.advanced}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {d.notes}
                    {d.tooltip && <InfoTooltip content={d.tooltip} source={d.source} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Oral dosage table */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            口服化合物
            <Badge variant="secondary">mg/天</Badge>
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>化合物</TableHead>
                <TableHead>初級</TableHead>
                <TableHead>中級</TableHead>
                <TableHead>高級</TableHead>
                <TableHead>備註</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oral.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.compound}</TableCell>
                  <TableCell>{d.beginner}</TableCell>
                  <TableCell>{d.intermediate}</TableCell>
                  <TableCell>{d.advanced}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {d.notes}
                    {d.tooltip && <InfoTooltip content={d.tooltip} source={d.source} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ScrollArea>
  )
}
