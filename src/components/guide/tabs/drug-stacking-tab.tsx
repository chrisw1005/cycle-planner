'use client'

import { drugInteractions, testBaseRule } from '@/lib/data/drug-guide'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

const severityConfig = {
  danger: { label: '禁止', variant: 'destructive' as const, borderClass: 'border-destructive/30' },
  caution: { label: '謹慎', variant: 'outline' as const, borderClass: 'border-yellow-500/30' },
  safe: { label: '安全', variant: 'default' as const, borderClass: 'border-green-500/30' },
}

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
