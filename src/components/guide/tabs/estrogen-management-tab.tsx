'use client'

import {
  aiComparison,
  estrogenSymptoms,
  aiProtocolRecommendations,
  aiKeyPoints,
} from '@/lib/data/drug-guide'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function EstrogenManagementTab() {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Key points */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h3 className="font-medium">核心原則</h3>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {aiKeyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        {/* AI Comparison */}
        <div className="space-y-2">
          <h3 className="font-medium">三種 AI 比較</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>藥物</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>典型劑量</TableHead>
                <TableHead>頻率</TableHead>
                <TableHead>E2 抑制</TableHead>
                <TableHead>脂質影響</TableHead>
                <TableHead>備註</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiComparison.map((ai, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{ai.name}</TableCell>
                  <TableCell className="text-xs">{ai.type}</TableCell>
                  <TableCell>{ai.typicalDose}</TableCell>
                  <TableCell>{ai.frequency}</TableCell>
                  <TableCell className="text-xs">{ai.e2Suppression}</TableCell>
                  <TableCell className="text-xs">{ai.lipidImpact}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ai.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Protocol recommendations */}
        <div className="space-y-2">
          <h3 className="font-medium">使用建議</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>情境</TableHead>
                <TableHead>建議</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiProtocolRecommendations.map((rec, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{rec.scenario}</TableCell>
                  <TableCell className="text-sm">{rec.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Symptoms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <h3 className="font-medium text-destructive">{estrogenSymptoms.high.title}</h3>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {estrogenSymptoms.high.symptoms.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
            <h3 className="font-medium text-blue-500">{estrogenSymptoms.low.title}</h3>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {estrogenSymptoms.low.symptoms.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
