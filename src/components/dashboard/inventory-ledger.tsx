'use client'

import { useInventoryTransactions } from '@/hooks/use-inventory-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History } from 'lucide-react'

const kindLabels: Record<string, string> = {
  shipment: '出貨',
  restock: '進貨',
  adjustment: '調整',
}

export function InventoryLedger() {
  const { data: transactions } = useInventoryTransactions(30)
  if (!transactions || transactions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-muted-foreground" />
          庫存異動紀錄
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {transactions.map((tx) => {
            const isIn = tx.delta > 0
            const person = tx.cycle?.person?.nickname
            const cycleLabel = tx.cycle
              ? tx.cycle.name || (person ? `${person} 的課表` : '課表')
              : null
            return (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      isIn
                        ? 'border-green-500/30 bg-green-500/10 text-green-500'
                        : 'border-red-500/30 bg-red-500/10 text-red-500'
                    }`}
                  >
                    {kindLabels[tx.kind] ?? tx.kind}
                  </span>
                  <span className="truncate font-medium">{tx.drug?.name ?? '—'}</span>
                  {cycleLabel && (
                    <span className="truncate text-muted-foreground">· {cycleLabel}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`font-semibold tabular-nums ${isIn ? 'text-green-500' : 'text-red-500'}`}>
                    {isIn ? '+' : ''}
                    {tx.delta}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
