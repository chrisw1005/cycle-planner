'use client'

import {
  drugInteractions,
  testBaseRule,
  multiCompoundStacks,
  multiCompoundPrinciples,
  testTrenRatioDebate,
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

export function DrugStackingTab() {
  const grouped = {
    danger: drugInteractions.filter((d) => d.severity === 'danger'),
    caution: drugInteractions.filter((d) => d.severity === 'caution'),
    safe: drugInteractions.filter((d) => d.severity === 'safe'),
  }

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Test base rule */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h3 className="font-medium">{testBaseRule.title}</h3>
          <p className="text-sm">{testBaseRule.description}</p>
          <p className="text-sm text-muted-foreground">{testBaseRule.reason}</p>
          <p className="text-xs text-muted-foreground">例外：{testBaseRule.exception}</p>
        </div>

        {/* Multi-compound principles */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-medium">多重化合物疊加原則</h3>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {multiCompoundPrinciples.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        {/* Multi-compound stacks */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Badge variant="secondary">三重化合物範例</Badge>
          </h3>
          {multiCompoundStacks.map((stack, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{stack.name}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{stack.goal}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>化合物</TableHead>
                    <TableHead>劑量範圍</TableHead>
                    <TableHead>備註</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stack.compounds.map((c, j) => (
                    <TableRow key={j}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.dosageRange}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {stack.keyPoints.map((p, k) => (
                  <li key={k}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Test/Tren ratio debate */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">{testTrenRatioDebate.title}</h3>
          <p className="text-sm text-muted-foreground">{testTrenRatioDebate.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-medium text-sm">{testTrenRatioDebate.highTest.label}</p>
              <div>
                <p className="text-xs font-medium text-green-500">優點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {testTrenRatioDebate.highTest.pros.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-destructive">缺點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {testTrenRatioDebate.highTest.cons.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-medium text-sm">{testTrenRatioDebate.lowTest.label}</p>
              <div>
                <p className="text-xs font-medium text-green-500">優點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {testTrenRatioDebate.lowTest.pros.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-destructive">缺點：</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {testTrenRatioDebate.lowTest.cons.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
          </div>
          <p className="text-sm">{testTrenRatioDebate.recommendation}</p>
        </div>

        {/* Danger */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Badge variant="destructive">禁止搭配</Badge>
          </h3>
          <div className="space-y-2">
            {grouped.danger.map((item, i) => (
              <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="font-medium text-sm">{item.combo}</p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Caution */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Badge variant="outline" className="border-yellow-500 text-yellow-500">謹慎使用</Badge>
          </h3>
          <div className="space-y-2">
            {grouped.caution.map((item, i) => (
              <div key={i} className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-1">
                <p className="font-medium text-sm">{item.combo}</p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safe */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Badge variant="outline" className="border-green-500 text-green-500">常見安全搭配</Badge>
          </h3>
          <div className="space-y-2">
            {grouped.safe.map((item, i) => (
              <div key={i} className="rounded-md border border-green-500/20 bg-green-500/5 p-3 space-y-1">
                <p className="font-medium text-sm">{item.combo}</p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
