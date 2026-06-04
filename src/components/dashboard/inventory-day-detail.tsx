'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { levelAtEndOfDay, type DayInventoryAgg, type DrugLevelSeries } from '@/lib/utils'
import type { InventoryTxKind } from '@/types'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'

// recharts needs real colors, not Tailwind classes.
const GREEN = '#22c55e'
const RED = '#ef4444'
const AMBER = '#f59e0b'

const KIND_LABEL: Record<InventoryTxKind, string> = {
  restock: '進貨',
  shipment: '出貨',
  adjustment: '調整',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayKey: string | null
  agg: DayInventoryAgg | null
  series: Map<string, DrugLevelSeries>
}

// One row per drug that moved on the clicked day.
interface DrugDayRow {
  drug_id: string
  name: string
  in: number // summed inflow magnitude
  out: number // summed outflow magnitude
  level: number | null // end-of-day resulting level
  unit: string
}

export function InventoryDayDetail({ open, onOpenChange, dayKey, agg, series }: Props) {
  const rows = useMemo<DrugDayRow[]>(() => {
    if (!agg || !dayKey) return []
    const byDrug = new Map<string, DrugDayRow>()
    for (const it of agg.items) {
      let row = byDrug.get(it.drug_id)
      if (!row) {
        const s = series.get(it.drug_id)
        row = { drug_id: it.drug_id, name: it.drug_name, in: 0, out: 0, level: s ? levelAtEndOfDay(s, dayKey) : null, unit: s?.unit ?? '' }
        byDrug.set(it.drug_id, row)
      }
      if (it.delta >= 0) row.in += it.delta
      else row.out += -it.delta
    }
    return [...byDrug.values()]
  }, [agg, dayKey, series])

  // Per-transaction rows with the TRUE running level after each event (a drug can move
  // more than once a day). agg.items are newest-first; series.points are ascending, so the
  // reversed per-day levels line up with the item order.
  const itemRows = useMemo(() => {
    if (!agg || !dayKey) return []
    const levelsByDrug = new Map<string, number[]>()
    for (const it of agg.items) {
      if (levelsByDrug.has(it.drug_id)) continue
      const s = series.get(it.drug_id)
      levelsByDrug.set(it.drug_id, s ? s.points.filter((p) => p.date === dayKey).map((p) => p.level).reverse() : [])
    }
    const seen = new Map<string, number>()
    return agg.items.map((it) => {
      const s = series.get(it.drug_id)
      const i = seen.get(it.drug_id) ?? 0
      seen.set(it.drug_id, i + 1)
      const level = s ? levelsByDrug.get(it.drug_id)![i] ?? levelAtEndOfDay(s, dayKey) : null
      return { drug_name: it.drug_name, kind: it.kind, delta: it.delta, level, unit: s?.unit ?? '' }
    })
  }, [agg, dayKey, series])

  const maxMag = Math.max(1, ...rows.map((r) => Math.max(r.in, r.out)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="tabular-nums">{dayKey ?? ''} 庫存異動</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">本日無異動</p>
        ) : (
          <Tabs defaultValue="list" className="min-h-0 flex-1">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="list">清單</TabsTrigger>
              <TabsTrigger value="chart">圖表</TabsTrigger>
            </TabsList>

            {/* 清單：每藥的進/出與當日結餘水位 */}
            <TabsContent value="list" className="mt-2 max-h-[65vh] overflow-y-auto">
              <ul className="divide-y divide-border">
                {itemRows.map((it, i) => {
                  const isIn = it.delta >= 0
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${isIn ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="truncate font-medium">{it.drug_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABEL[it.kind]}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 tabular-nums">
                        <span className={isIn ? 'text-green-500' : 'text-red-500'}>
                          {isIn ? '+' : ''}
                          {it.delta}
                        </span>
                        <span className="text-xs text-amber-500">
                          → 餘 {it.level == null ? '—' : `${it.level} ${it.unit}`}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </TabsContent>

            {/* 圖表：當日進出長條 + 每藥水位趨勢折線 */}
            <TabsContent value="chart" className="mt-2 max-h-[65vh] space-y-4 overflow-y-auto">
              <section className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">當日進出（綠進／紅出）</p>
                <div className="space-y-1.5">
                  {rows.map((r) => (
                    <div key={r.drug_id} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 truncate sm:w-32">{r.name}</span>
                      <div className="flex flex-1 items-center">
                        <div className="flex w-1/2 justify-end">
                          {r.out > 0 && (
                            <div className="flex h-3.5 items-center justify-end rounded-l-sm bg-red-500/70 px-1 text-[10px] text-white" style={{ width: `${(r.out / maxMag) * 100}%` }}>
                              {r.out}
                            </div>
                          )}
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex w-1/2 justify-start">
                          {r.in > 0 && (
                            <div className="flex h-3.5 items-center rounded-r-sm bg-green-500/70 px-1 text-[10px] text-white" style={{ width: `${(r.in / maxMag) * 100}%` }}>
                              {r.in}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums text-amber-500">
                        餘 {r.level == null ? '—' : `${r.level} ${r.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">水位趨勢（橘＝庫存水位）</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {rows.map((r) => {
                    const s = series.get(r.drug_id)
                    return <DrugTrend key={r.drug_id} name={r.name} series={s} highlight={dayKey} />
                  })}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Mini water-level line chart for one drug across the loaded window.
function DrugTrend({ name, series, highlight }: { name: string; series: DrugLevelSeries | undefined; highlight: string | null }) {
  const { data, dayDir } = useMemo(() => {
    if (!series) return { data: [] as { date: string; level: number }[], dayDir: new Map<string, number>() }
    // One point per day = end-of-day level; per-day net delta for dot colour.
    const levelByDay = new Map<string, number>()
    const deltaByDay = new Map<string, number>()
    for (const p of series.points) {
      levelByDay.set(p.date, p.level)
      deltaByDay.set(p.date, (deltaByDay.get(p.date) ?? 0) + p.delta)
    }
    return {
      data: [...levelByDay.entries()].map(([date, level]) => ({ date, level })),
      dayDir: deltaByDay,
    }
  }, [series])

  return (
    <div className="min-w-0 rounded-lg ring-1 ring-foreground/10 p-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium">{name}</span>
        {series && (
          <span className="shrink-0 tabular-nums text-muted-foreground">
            現量 {series.current} {series.unit}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-muted-foreground">無資料</p>
      ) : (
        <ResponsiveContainer width="100%" height={88}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <XAxis dataKey="date" hide />
            <RTooltip
              cursor={{ stroke: AMBER, strokeOpacity: 0.3 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded bg-popover px-2 py-1 text-[11px] tabular-nums ring-1 ring-foreground/10">
                    {String(label)}：{payload[0].value} {series?.unit ?? ''}
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="level"
              stroke={AMBER}
              strokeWidth={1.75}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: { date: string }; index?: number }) => {
                const { cx, cy, payload, index } = props
                if (cx == null || cy == null || !payload) return <g key={index} />
                const up = (dayDir.get(payload.date) ?? 0) >= 0
                const isHi = payload.date === highlight
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={isHi ? 4 : 2.5}
                    fill={up ? GREEN : RED}
                    stroke={isHi ? AMBER : 'transparent'}
                    strokeWidth={isHi ? 1.5 : 0}
                  />
                )
              }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
