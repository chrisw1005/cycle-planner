'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useInventoryTransactions } from '@/hooks/use-inventory-transactions'
import { useDrugs } from '@/hooks/use-drugs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, aggregateTransactionsByDay, buildDrugLevelSeries, localDayKey, type DayInventoryAgg } from '@/lib/utils'

// recharts lives in the day-detail dialog; lazy-load it so it stays out of SSR and
// the initial dashboard bundle (only fetched when a user opens a day).
const InventoryDayDetail = dynamic(
  () => import('./inventory-day-detail').then((m) => m.InventoryDayDetail),
  { ssr: false }
)

type View = 'calendar' | 'heatmap' | 'strip'
type RangeUnit = 'month' | 'quarter' | 'half' | 'year'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const RANGE_LABELS: Record<RangeUnit, string> = { month: '月', quarter: '季', half: '半年', year: '年' }

// Heatmap intensity shades (literal classes so Tailwind keeps them), by activity bucket.
const GREEN_SCALE = ['bg-green-500/30', 'bg-green-500/55', 'bg-green-500/75', 'bg-green-500']
const RED_SCALE = ['bg-red-500/30', 'bg-red-500/55', 'bg-red-500/75', 'bg-red-500']

function bucketOf(total: number): number {
  return total >= 10 ? 3 : total >= 5 ? 2 : total >= 3 ? 1 : 0 // 1-2, 3-4, 5-9, 10+
}

interface HeatRange {
  start: Date
  end: Date
  label: string
  prevAnchor: Date
  nextAnchor: Date
}

function heatmapRange(anchor: Date, unit: RangeUnit): HeatRange {
  const y = anchor.getFullYear()
  const m0 = anchor.getMonth()
  if (unit === 'year') {
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31), label: `${y}`, prevAnchor: new Date(y - 1, 0, 1), nextAnchor: new Date(y + 1, 0, 1) }
  }
  if (unit === 'half') {
    const sm = m0 < 6 ? 0 : 6
    return { start: new Date(y, sm, 1), end: new Date(y, sm + 6, 0), label: `${y} H${sm / 6 + 1}`, prevAnchor: new Date(y, sm - 6, 1), nextAnchor: new Date(y, sm + 6, 1) }
  }
  if (unit === 'quarter') {
    const sm = Math.floor(m0 / 3) * 3
    return { start: new Date(y, sm, 1), end: new Date(y, sm + 3, 0), label: `${y} Q${sm / 3 + 1}`, prevAnchor: new Date(y, sm - 3, 1), nextAnchor: new Date(y, sm + 3, 1) }
  }
  return { start: new Date(y, m0, 1), end: new Date(y, m0 + 1, 0), label: `${y} 年 ${m0 + 1} 月`, prevAnchor: new Date(y, m0 - 1, 1), nextAnchor: new Date(y, m0 + 1, 1) }
}

// GitHub-style grid: array of week-columns, each 7 entries (Mon..Sun), null = outside range.
function buildHeatWeeks(start: Date, end: Date): (string | null)[][] {
  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)) // back to the Monday on/before start
  const cols: (string | null)[][] = []
  while (cursor <= end) {
    const col: (string | null)[] = []
    for (let r = 0; r < 7; r++) {
      col.push(cursor < start || cursor > end ? null : localDayKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    cols.push(col)
  }
  return cols
}

function colMonth(col: (string | null)[]): number | null {
  for (const k of col) if (k) return Number(k.slice(5, 7))
  return null
}

export function InventoryCalendar() {
  const { data: txs } = useInventoryTransactions(300)
  const { data: drugs } = useDrugs()
  const [view, setView] = useState<View>('calendar')
  const [rangeUnit, setRangeUnit] = useState<RangeUnit>('year')
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpYear, setJumpYear] = useState(2026)
  const [detailDay, setDetailDay] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const initialized = useRef(false)

  const byDay = useMemo(() => aggregateTransactionsByDay(txs ?? []), [txs])
  const series = useMemo(() => buildDrugLevelSeries(txs ?? [], drugs ?? []), [txs, drugs])

  useEffect(() => {
    if (initialized.current || txs === undefined) return
    initialized.current = true
    const latest = txs[0]?.created_at
    const base = latest ? new Date(latest) : new Date()
    setAnchor(new Date(base.getFullYear(), base.getMonth(), 1))
  }, [txs])

  if (!txs || txs.length === 0 || !anchor) return null

  const year = anchor.getFullYear()
  const month0 = anchor.getMonth()
  const hr = heatmapRange(anchor, rangeUnit)

  const openDetail = (key: string) => {
    setDetailDay(key)
    setDetailOpen(true)
  }
  const goPrev = () => setAnchor(view === 'heatmap' ? hr.prevAnchor : new Date(year, month0 - 1, 1))
  const goNext = () => setAnchor(view === 'heatmap' ? hr.nextAnchor : new Date(year, month0 + 1, 1))
  const periodLabel = view === 'heatmap' ? hr.label : `${year} 年 ${month0 + 1} 月`

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
          <div className="flex flex-wrap items-center gap-2">
            {view === 'heatmap' && (
              <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs">
                {(['month', 'quarter', 'half', 'year'] as RangeUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setRangeUnit(u)}
                    className={cn(
                      'rounded-md px-2 py-1 transition-colors',
                      rangeUnit === u ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {RANGE_LABELS[u]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goPrev} aria-label="上一個期間">
                <ChevronLeft />
              </Button>
              <Popover
                open={jumpOpen}
                onOpenChange={(o) => {
                  setJumpOpen(o)
                  if (o) setJumpYear(year)
                }}
              >
                <PopoverTrigger
                  render={<button className="rounded-md px-2 py-1 text-sm font-medium tabular-nums hover:bg-muted" />}
                >
                  {periodLabel}
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="icon-sm" onClick={() => setJumpYear((y) => y - 1)} aria-label="前一年">
                        <ChevronLeft />
                      </Button>
                      <span className="text-sm font-medium tabular-nums">{jumpYear}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => setJumpYear((y) => y + 1)} aria-label="後一年">
                        <ChevronRight />
                      </Button>
                    </div>
                    {view === 'heatmap' ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setAnchor(new Date(jumpYear, month0, 1))
                          setJumpOpen(false)
                        }}
                      >
                        跳到 {jumpYear} 年
                      </Button>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
                          <Button
                            key={mm}
                            variant={jumpYear === year && mm - 1 === month0 ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => {
                              setAnchor(new Date(jumpYear, mm - 1, 1))
                              setJumpOpen(false)
                            }}
                          >
                            {mm} 月
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={goNext} aria-label="下一個期間">
                <ChevronRight />
              </Button>
            </div>
          </div>

          {view === 'heatmap' ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>少</span>
              {[
                ['bg-muted', '0'],
                ['bg-green-500/30', '1-2'],
                ['bg-green-500/55', '3-4'],
                ['bg-green-500/75', '5-9'],
                ['bg-green-500', '10+'],
              ].map(([c, l]) => (
                <span key={l} className="flex flex-col items-center gap-0.5">
                  <span className={`h-3 w-3 rounded-sm ${c}`} />
                  <span className="tabular-nums">{l}</span>
                </span>
              ))}
              <span>多</span>
              <span className="ml-1">（紅＝淨流出）</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />流入
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />流出
              </span>
              <span className="text-[11px]">橘＝庫存水位（點日看圖表）</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {view === 'calendar' ? (
          <CalendarView year={year} month0={month0} byDay={byDay} onPick={openDetail} />
        ) : view === 'heatmap' ? (
          <HeatmapView range={hr} byDay={byDay} onPick={openDetail} />
        ) : (
          <StripView year={year} month0={month0} byDay={byDay} onPick={openDetail} />
        )}
      </CardContent>

      {detailOpen && (
        <InventoryDayDetail
          open={detailOpen}
          onOpenChange={setDetailOpen}
          dayKey={detailDay}
          agg={detailDay ? byDay.get(detailDay) ?? null : null}
          series={series}
        />
      )}
    </Card>
  )
}

function CountDot({ dir, count }: { dir: 'in' | 'out'; count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dir === 'in' ? 'bg-green-500' : 'bg-red-500'}`} />
      {count}
    </span>
  )
}

function CalendarView({
  year,
  month0,
  byDay,
  onPick,
}: {
  year: number
  month0: number
  byDay: Map<string, DayInventoryAgg>
  onPick: (key: string) => void
}) {
  const dim = new Date(year, month0 + 1, 0).getDate()
  const offset = (new Date(year, month0, 1).getDay() + 6) % 7
  const days = Array.from({ length: dim }, (_, i) => {
    const key = localDayKey(new Date(year, month0, i + 1))
    return { day: i + 1, key, agg: byDay.get(key) }
  })
  if (!days.some((d) => d.agg)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">本期間無異動</p>
  }
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
                  {agg.inflow.count > 0 && <CountDot dir="in" count={agg.inflow.count} />}
                  {agg.outflow.count > 0 && <CountDot dir="out" count={agg.outflow.count} />}
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
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex min-h-[56px] flex-col rounded-md border border-border p-1 text-left transition-colors hover:bg-accent/50"
            >
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function HeatmapView({
  range,
  byDay,
  onPick,
}: {
  range: HeatRange
  byDay: Map<string, DayInventoryAgg>
  onPick: (key: string) => void
}) {
  const weeks = buildHeatWeeks(range.start, range.end)
  // Check activity by local day-key (the same basis the grid uses) — parsing the
  // 'YYYY-MM-DD' key as a Date would be UTC and could drop the range's last day in UTC+ zones.
  const anyActivity = weeks.some((col) => col.some((k) => k != null && byDay.has(k)))
  if (!anyActivity) {
    return <p className="py-8 text-center text-sm text-muted-foreground">本期間無異動</p>
  }
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto w-fit">
        {/* month labels */}
        <div className="flex gap-1">
          <div className="w-5 shrink-0" />
          {weeks.map((col, ci) => {
            const m = colMonth(col)
            const show = m !== null && m !== (ci > 0 ? colMonth(weeks[ci - 1]) : null)
            return (
              <div key={ci} className="w-4 text-center text-[9px] text-muted-foreground tabular-nums">
                {show ? `${m}月` : ''}
              </div>
            )
          })}
        </div>
        <div className="flex gap-1">
          <div className="flex w-5 shrink-0 flex-col gap-1 text-[9px] leading-4 text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="h-4">{w}</div>
            ))}
          </div>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((key, ri) => {
                if (!key) return <div key={ri} className="h-4 w-4" />
                const d = byDay.get(key)
                const total = d ? d.inflow.count + d.outflow.count : 0
                if (total === 0) return <div key={ri} className="h-4 w-4 rounded-sm bg-muted" />
                const net = d!.inflow.delta + d!.outflow.delta
                const cls = (net >= 0 ? GREEN_SCALE : RED_SCALE)[bucketOf(total)]
                return (
                  <Tooltip key={ri}>
                    <TooltipTrigger
                      type="button"
                      onClick={() => onPick(key)}
                      className={`h-4 w-4 rounded-sm ${cls}`}
                      aria-label={`${key} 流入${d!.inflow.count} 流出${d!.outflow.count}`}
                    />
                    <TooltipContent>
                      {key} · 流入 {d!.inflow.count} / 流出 {d!.outflow.count}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StripView({
  year,
  month0,
  byDay,
  onPick,
}: {
  year: number
  month0: number
  byDay: Map<string, DayInventoryAgg>
  onPick: (key: string) => void
}) {
  const dim = new Date(year, month0 + 1, 0).getDate()
  const days = Array.from({ length: dim }, (_, i) => {
    const key = localDayKey(new Date(year, month0, i + 1))
    return { day: i + 1, key, agg: byDay.get(key) }
  })
  if (!days.some((d) => d.agg)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">本期間無異動</p>
  }
  const cols = { gridTemplateColumns: `3rem repeat(${dim}, minmax(0, 1fr))` }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] space-y-1">
        <div className="grid items-center gap-0.5" style={cols}>
          <div />
          {days.map(({ day }) => (
            <div key={day} className="text-center text-[9px] tabular-nums text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        {(['inflow', 'outflow'] as const).map((dir) => (
          <div key={dir} className="grid items-center gap-0.5" style={cols}>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${dir === 'inflow' ? 'bg-green-500' : 'bg-red-500'}`} />
              {dir === 'inflow' ? '流入' : '流出'}
            </div>
            {days.map(({ day, key, agg }) => {
              const count = agg ? agg[dir].count : 0
              if (count === 0) return <div key={day} className="h-7 rounded-sm bg-muted/40" />
              const color = dir === 'inflow' ? 'bg-green-500/25 text-green-500' : 'bg-red-500/25 text-red-500'
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onPick(key)}
                  className={`flex h-7 items-center justify-center rounded-sm text-[10px] font-medium tabular-nums transition-opacity hover:opacity-80 ${color}`}
                  aria-label={`${day} 日 ${dir === 'inflow' ? '流入' : '流出'} ${count}`}
                >
                  {count}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
