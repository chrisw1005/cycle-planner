'use client'

import { useMemo, useState } from 'react'
import { useInventoryTransactions } from '@/hooks/use-inventory-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History, ChevronRight } from 'lucide-react'
import type { InventoryTransaction, InventoryTxKind } from '@/types'

const kindLabels: Record<string, string> = {
  shipment: '出貨',
  restock: '進貨',
  adjustment: '調整',
}

// One ledger entry = one inventory-change event. Rows written by the same action
// (completing a cycle, one batch restock) share an exact created_at, so grouping by
// (created_at, kind, cycle_id) collapses them into a single, non-growing line.
interface LedgerEvent {
  key: string
  created_at: string
  kind: InventoryTxKind
  cycle: InventoryTransaction['cycle']
  items: { drug_name: string; delta: number }[]
  netDelta: number
}

function groupByEvent(transactions: InventoryTransaction[], maxEvents: number): LedgerEvent[] {
  const map = new Map<string, LedgerEvent>()
  for (const tx of transactions) {
    const key = `${tx.created_at}|${tx.kind}|${tx.cycle_id ?? ''}`
    let ev = map.get(key)
    if (!ev) {
      ev = { key, created_at: tx.created_at, kind: tx.kind, cycle: tx.cycle, items: [], netDelta: 0 }
      map.set(key, ev)
    }
    ev.items.push({ drug_name: tx.drug?.name ?? '—', delta: tx.delta })
    ev.netDelta += tx.delta
  }
  return Array.from(map.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, maxEvents)
}

export function InventoryLedger() {
  const { data: transactions } = useInventoryTransactions(300)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const events = useMemo(() => groupByEvent(transactions ?? [], 60), [transactions])

  if (events.length === 0) return null

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-muted-foreground" />
          庫存異動紀錄
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="max-h-[420px] divide-y divide-border overflow-y-auto -mr-2 pr-2">
          {events.map((ev) => {
            const isIn = ev.netDelta > 0
            const person = ev.cycle?.person?.nickname
            const cycleLabel = ev.cycle
              ? ev.cycle.name || (person ? `${person} 的課表` : '課表')
              : null
            const multi = ev.items.length > 1
            const isOpen = expanded.has(ev.key)
            // Single-item events show the drug name inline; multi-item events show a count.
            const primaryLabel = cycleLabel ?? (multi ? `${ev.items.length} 項藥品` : ev.items[0].drug_name)

            return (
              <li key={ev.key} className="py-2 text-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => multi && toggle(ev.key)}
                  aria-expanded={multi ? isOpen : undefined}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        isIn
                          ? 'border-green-500/30 bg-green-500/10 text-green-500'
                          : 'border-red-500/30 bg-red-500/10 text-red-500'
                      }`}
                    >
                      {kindLabels[ev.kind] ?? ev.kind}
                    </span>
                    <span className="truncate font-medium">{primaryLabel}</span>
                    {multi && (
                      <span className="shrink-0 text-xs text-muted-foreground">· {ev.items.length} 項</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`font-semibold tabular-nums ${isIn ? 'text-green-500' : 'text-red-500'}`}>
                      {isIn ? '+' : ''}
                      {ev.netDelta}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(ev.created_at).toLocaleDateString('zh-TW')}
                    </span>
                    {multi ? (
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    ) : (
                      <span className="w-4" />
                    )}
                  </div>
                </button>

                {multi && isOpen && (
                  <ul className="mt-1.5 space-y-1 border-l border-border pl-4">
                    {ev.items.map((it, i) => {
                      const itemIn = it.delta > 0
                      return (
                        <li key={i} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate text-muted-foreground">{it.drug_name}</span>
                          <span className={`tabular-nums ${itemIn ? 'text-green-500' : 'text-red-500'}`}>
                            {itemIn ? '+' : ''}
                            {it.delta}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
