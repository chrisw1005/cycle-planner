'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryTransactions } from '@/hooks/use-inventory-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { aggregateTransactionsByDay, localDayKey, type DayInventoryAgg } from '@/lib/utils'
import type { InventoryTxKind } from '@/types'

type View = 'calendar' | 'heatmap' | 'strip'

// Mon-first weekday labels (the schedule grid is Mon..Sun too).
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const KIND_META: Record<InventoryTxKind, { label: string; dot: string }> = {
  restock: { label: '進貨', dot: 'bg-green-500' },
  shipment: { label: '出貨', dot: 'bg-red-500' },
  adjustment: { label: '調整', dot: 'bg-amber-500' },
}

// Literal class strings (Tailwind can't see interpolated names) for heatmap shades,
// indexed by activity count bucket (1, 2, 3, 4+).
const HEAT: Record<InventoryTxKind, string[]> = {
  restock: ['bg-green-500/30', 'bg-green-500/50', 'bg-green-500/70', 'bg-green-500'],
  shipment: ['bg-red-500/30', 'bg-red-500/50', 'bg-red-500/70', 'bg-red-500'],
  adjustment: ['bg-amber-500/30', 'bg-amber-500/50', 'bg-amber-500/70', 'bg-amber-500'],
}

function dominantKind(agg: DayInventoryAgg): InventoryTxKind {
  const ranked: [InventoryTxKind, number][] = [
    ['restock', agg.restock.count],
    ['shipment', agg.shipment.count],
    ['adjustment', agg.adjustment.count],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return ranked[0][0]
}

function dayTotal(agg: DayInventoryAgg): number {
  return agg.restock.count + agg.shipment.count + agg.adjustment.count
}

function summaryParts(agg: DayInventoryAgg): string {
  const parts: string[] = []
  if (agg.restock.count) parts.push(`進 ${agg.restock.count}`)
  if (agg.shipment.count) parts.push(`出 ${agg.shipment.count}`)
  if (agg.adjustment.count) parts.push(`調 ${agg.adjustment.count}`)
  return parts.join(' / ')
}

// Per-day detail shown in a Popover (calendar / strip click).
function DayDetail({ agg }: { agg: DayInventoryAgg }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tabular-nums">{agg.date}</p>
      <ul className="space-y-1">
        {agg.items.map((it, i) => {
          const isIn = it.delta > 0
          return (
            <li key={i} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${KIND_META[it.kind].dot}`} />
                <span className="truncate">{it.drug_name}</span>
                <span className="shrink-0 text-muted-foreground">{KIND_META[it.kind].label}</span>
              </span>
              <span className={`shrink-0 tabular-nums ${isIn ? 'text-green-500' : 'text-red-500'}`}>
                {isIn ? '+' : ''}
                {it.delta}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function InventoryCalendar() {
  const { data: txs } = useInventoryTransactions(300)
  const [view, setView] = useState<View>('calendar')
  // Initialised client-side (effect) to the latest transaction's month — avoids any
  // SSR/CSR `new Date()` mismatch and lands the user on a month that has data.
  const [viewMonth, setViewMonth] = useState<Date | null>(null)
  const initialized = useRef(false)

  const byDay = useMemo(() => aggregateTransactionsByDay(txs ?? []), [txs])

  useEffect(() => {
    if (initialized.current || txs === undefined) return
    initialized.current = true
    const latest = txs[0]?.created_at // hook returns newest first
    const base = latest ? new Date(latest) : new Date()
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1))
  }, [txs])

  if (!txs || txs.length === 0 || !viewMonth) return null

  const year = viewMonth.getFullYear()
  const month0 = viewMonth.getMonth()
  const dim = new Date(year, month0 + 1, 0).getDate()
  const offset = (new Date(year, month0, 1).getDay() + 6) % 7 // Mon=0 leading blanks
  const keyOf = (day: number) => localDayKey(new Date(year, month0, day))

  const days = Array.from({ length: dim }, (_, i) => {
    const day = i + 1
    return { day, key: keyOf(day), agg: byDay.get(keyOf(day)) }
  })
  const hasActivity = days.some((d) => d.agg)
  const hasAdjustment = days.some((d) => d.agg && d.agg.adjustment.count > 0)

  const shiftMonth = (delta: number) => setViewMonth(new Date(year, month0 + delta, 1))

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            庫存異動
          </CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList variant="line">
              <TabsTrigger value="calendar">月曆</TabsTrigger>
              <TabsTrigger value="heatmap">熱力圖</TabsTrigger>
              <TabsTrigger value="strip">長條</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="上個月">
              <ChevronLeft />
            </Button>
            <span className="min-w-[104px] text-center text-sm font-medium tabular-nums">
              {year} 年 {month0 + 1} 月
            </span>
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="下個月">
              <ChevronRight />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />進貨
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />出貨
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />調整
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <p className="py-8 text-center text-sm text-muted-foreground">本月無異動</p>
        ) : view === 'calendar' ? (
          <CalendarView days={days} offset={offset} />
        ) : view === 'heatmap' ? (
          <HeatmapView year={year} month0={month0} dim={dim} offset={offset} byDay={byDay} />
        ) : (
          <StripView days={days} hasAdjustment={hasAdjustment} />
        )}
      </CardContent>
    </Card>
  )
}

function CountDot({ kind, count }: { kind: InventoryTxKind; count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${KIND_META[kind].dot}`} />
      {count}
    </span>
  )
}

function CalendarView({
  days,
  offset,
}: {
  days: { day: number; key: string; agg: DayInventoryAgg | undefined }[]
  offset: number
}) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map(({ day, key, agg }) => {
          const inner = (
            <>
              <span className="text-xs tabular-nums">{day}</span>
              {agg && (
                <span className="mt-auto flex flex-wrap items-center gap-1">
                  {agg.restock.count > 0 && <CountDot kind="restock" count={agg.restock.count} />}
                  {agg.shipment.count > 0 && <CountDot kind="shipment" count={agg.shipment.count} />}
                  {agg.adjustment.count > 0 && <CountDot kind="adjustment" count={agg.adjustment.count} />}
                </span>
              )}
            </>
          )
          if (!agg) {
            return (
              <div key={key} className="flex min-h-[56px] flex-col rounded-md border border-border p-1 text-muted-foreground">
                {inner}
              </div>
            )
          }
          return (
            <Popover key={key}>
              <PopoverTrigger
                render={
                  <button className="flex min-h-[56px] flex-col rounded-md border border-border p-1 text-left transition-colors hover:bg-accent/50" />
                }
              >
                {inner}
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <DayDetail agg={agg} />
              </PopoverContent>
            </Popover>
          )
        })}
      </div>
    </div>
  )
}

function HeatmapView({
  year,
  month0,
  dim,
  offset,
  byDay,
}: {
  year: number
  month0: number
  dim: number
  offset: number
  byDay: Map<string, DayInventoryAgg>
}) {
  const weeks = Math.ceil((offset + dim) / 7)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col gap-1 pr-1 text-[10px] leading-4 text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="h-4">{w}</div>
          ))}
        </div>
        {Array.from({ length: weeks }).map((_, c) => (
          <div key={c} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, r) => {
              const day = c * 7 + r - offset + 1
              if (day < 1 || day > dim) return <div key={r} className="h-4 w-4" />
              const agg = byDay.get(localDayKey(new Date(year, month0, day)))
              if (!agg) return <div key={r} className="h-4 w-4 rounded-sm bg-muted" />
              const total = dayTotal(agg)
              const cls = HEAT[dominantKind(agg)][Math.min(total - 1, 3)]
              return (
                <Tooltip key={r}>
                  <TooltipTrigger className={`h-4 w-4 rounded-sm ${cls}`} aria-label={`${agg.date} ${summaryParts(agg)}`} />
                  <TooltipContent>
                    {agg.date} · {summaryParts(agg)}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        少
        <span className="h-3 w-3 rounded-sm bg-muted" />
        <span className="h-3 w-3 rounded-sm bg-green-500/30" />
        <span className="h-3 w-3 rounded-sm bg-green-500/50" />
        <span className="h-3 w-3 rounded-sm bg-green-500/70" />
        <span className="h-3 w-3 rounded-sm bg-green-500" />
        多
      </div>
    </div>
  )
}

function StripView({
  days,
  hasAdjustment,
}: {
  days: { day: number; key: string; agg: DayInventoryAgg | undefined }[]
  hasAdjustment: boolean
}) {
  const rows: InventoryTxKind[] = hasAdjustment
    ? ['restock', 'shipment', 'adjustment']
    : ['restock', 'shipment']

  return (
    <div className="space-y-1 overflow-x-auto pb-1">
      <div className="flex gap-0.5 pl-14">
        {days.map(({ day }) => (
          <div key={day} className="w-5 shrink-0 text-center text-[9px] tabular-nums text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      {rows.map((kind) => (
        <div key={kind} className="flex items-center gap-0.5">
          <div className="flex w-14 shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${KIND_META[kind].dot}`} />
            {KIND_META[kind].label}
          </div>
          {days.map(({ day, key, agg }) => {
            const count = agg ? agg[kind].count : 0
            if (count === 0) {
              return <div key={key} className="h-6 w-5 shrink-0 rounded-sm bg-muted/40" />
            }
            const color =
              kind === 'restock'
                ? 'bg-green-500/20 text-green-500'
                : kind === 'shipment'
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-amber-500/20 text-amber-500'
            return (
              <Popover key={key}>
                <PopoverTrigger
                  render={
                    <button
                      className={`flex h-6 w-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-medium tabular-nums transition-opacity hover:opacity-80 ${color}`}
                      aria-label={`${day} 日 ${KIND_META[kind].label} ${count}`}
                    />
                  }
                >
                  {count}
                </PopoverTrigger>
                {agg && (
                  <PopoverContent className="w-60">
                    <DayDetail agg={agg} />
                  </PopoverContent>
                )}
              </Popover>
            )
          })}
        </div>
      ))}
    </div>
  )
}
