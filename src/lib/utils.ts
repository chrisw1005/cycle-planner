import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DrugInventoryDelta, InventoryTransaction, InventoryTxKind, PrimaryCategory, EsterType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ALL_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Get day labels rotated to match the start_date's weekday.
 * If no start_date, defaults to Mon-Sun.
 * @param startDate - ISO date string (e.g. "2026-04-08")
 */
export function getDayLabels(startDate?: string | null): string[] {
  if (!startDate) return ALL_DAY_LABELS
  // JS Date: 0=Sun, 1=Mon, ..., 6=Sat
  // Our labels: 0=Mon, 1=Tue, ..., 6=Sun
  const d = new Date(startDate + 'T00:00:00')
  const jsDay = d.getDay() // 0=Sun
  const offset = jsDay === 0 ? 6 : jsDay - 1 // convert to Mon=0 index
  return [...ALL_DAY_LABELS.slice(offset), ...ALL_DAY_LABELS.slice(0, offset)]
}

/**
 * Extract dose unit from drug unit string for display.
 * e.g. 'mg/ml' → 'mg', 'mcg/tab' → 'mcg', 'IU/vial' → 'IU'
 */
export function getDoseUnit(unit?: string | null): string {
  if (!unit) return 'mg'
  const slash = unit.indexOf('/')
  return slash > 0 ? unit.slice(0, slash) : unit
}

export function formatOralInventory(
  totalTablets: number,
  tabsPerBox: number | null,
  unit: string = '盒'
): string {
  if (!tabsPerBox || tabsPerBox <= 0) return `${totalTablets} 顆`
  const boxes = Math.floor(totalTablets / tabsPerBox)
  const remaining = totalTablets % tabsPerBox
  if (boxes === 0) return `${remaining} 顆`
  if (remaining === 0) return `${boxes} ${unit}`
  return `${boxes} ${unit} ${remaining} 顆`
}

/**
 * Whole packages needed to cover an oral shortage, rounded up.
 * deficitTablets is the signed/raw tablet deficit; sign is ignored.
 */
export function oralDeficitPackages(deficitTablets: number, tabsPerBox: number | null): number {
  return Math.ceil(Math.abs(deficitTablets) / (tabsPerBox || 100))
}

/**
 * Format a whole-NTD amount with thousands separators (e.g. 15000 → "15,000").
 * Returns '' for null/invalid so callers can show a placeholder.
 */
export function formatThousands(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  return Math.round(value).toLocaleString('en-US')
}

export const CATEGORY_LABELS: Record<string, string> = {
  Injectable: '針劑',
  Oral: '口服',
  PCT: 'PCT',
  Other: '其他',
}

export function groupDeltasByCategory(
  deltas: DrugInventoryDelta[]
): { category: string; label: string; items: DrugInventoryDelta[] }[] {
  const order = ['Injectable', 'Oral', 'PCT', 'Other']
  const grouped = new Map<string, DrugInventoryDelta[]>()
  for (const d of deltas) {
    if (!grouped.has(d.category)) grouped.set(d.category, [])
    grouped.get(d.category)!.push(d)
  }
  return order
    .filter(cat => grouped.has(cat))
    .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, items: grouped.get(cat)! }))
}

// ==================== Inventory daily aggregation ====================
const pad2 = (n: number) => String(n).padStart(2, '0')

/** Local 'YYYY-MM-DD' key for an inventory transaction (aligns with the ledger's
 * toLocaleDateString display — avoids UTC day-boundary drift). */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export interface DayInventoryAgg {
  date: string // local 'YYYY-MM-DD'
  restock: { count: number; delta: number }
  shipment: { count: number; delta: number }
  adjustment: { count: number; delta: number }
  // Direction buckets (any kind): inflow = delta > 0, outflow = delta < 0.
  // The at-a-glance views colour by direction (green/red); amber is reserved for
  // the water-level line in charts, so adjustment-kind movements are never hidden.
  inflow: { count: number; delta: number }
  outflow: { count: number; delta: number }
  items: { drug_id: string; drug_name: string; delta: number; kind: InventoryTxKind }[]
}

/**
 * Bucket inventory transactions by local calendar day. Each day carries both the
 * per-kind totals (restock/shipment/adjustment, for detail labels) and the
 * direction totals (inflow/outflow, for at-a-glance colouring), plus a flat item
 * list. Used by the overview calendar/heatmap visualization.
 */
export function aggregateTransactionsByDay(
  txs: InventoryTransaction[]
): Map<string, DayInventoryAgg> {
  const map = new Map<string, DayInventoryAgg>()
  for (const tx of txs) {
    const key = localDayKey(new Date(tx.created_at))
    let day = map.get(key)
    if (!day) {
      day = {
        date: key,
        restock: { count: 0, delta: 0 },
        shipment: { count: 0, delta: 0 },
        adjustment: { count: 0, delta: 0 },
        inflow: { count: 0, delta: 0 },
        outflow: { count: 0, delta: 0 },
        items: [],
      }
      map.set(key, day)
    }
    const bucket = day[tx.kind]
    bucket.count += 1
    bucket.delta += tx.delta
    const dir = tx.delta >= 0 ? day.inflow : day.outflow
    dir.count += 1
    dir.delta += tx.delta
    day.items.push({ drug_id: tx.drug_id, drug_name: tx.drug?.name ?? '—', delta: tx.delta, kind: tx.kind })
  }
  return map
}

// ==================== Inventory water-level reconstruction ====================
export interface DrugLevelPoint {
  date: string // local 'YYYY-MM-DD' of the event
  level: number // inventory level immediately AFTER this event
  delta: number
  kind: InventoryTxKind
}

export interface DrugLevelSeries {
  drug_id: string
  drug_name: string
  unit: '瓶' | '顆' // injectable (incl. E3D) = 瓶; oral/PCT/Other = 顆
  current: number // current inventory_count (level after the most recent event)
  points: DrugLevelPoint[] // ascending by time
}

/**
 * Reconstruct each drug's inventory level over time from the ledger. The ledger
 * stores only deltas (in the same unit as drugs.inventory_count per category), so
 * we anchor at the current inventory_count and walk backwards: the level after the
 * newest event is the current count, and level_after(prev) = level_after(next) − delta(next).
 * Exact within the loaded transaction window; drugs with no current record are skipped.
 */
export function buildDrugLevelSeries(
  txs: InventoryTransaction[],
  drugs: { id: string; name: string; primary_category: PrimaryCategory; ester_type: EsterType | null; inventory_count: number }[]
): Map<string, DrugLevelSeries> {
  const drugById = new Map(drugs.map((d) => [d.id, d]))
  const byDrug = new Map<string, InventoryTransaction[]>()
  for (const tx of txs) {
    if (!byDrug.has(tx.drug_id)) byDrug.set(tx.drug_id, [])
    byDrug.get(tx.drug_id)!.push(tx)
  }
  const result = new Map<string, DrugLevelSeries>()
  for (const [drugId, list] of byDrug) {
    const drug = drugById.get(drugId)
    if (!drug) continue // deleted drug — no anchor for the level
    const asc = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const isE3D = drug.ester_type === 'E3D'
    const isOral = !isE3D && (drug.primary_category === 'Oral' || drug.primary_category === 'PCT' || drug.primary_category === 'Other')
    const unit: '瓶' | '顆' = isOral ? '顆' : '瓶'
    const levels = new Array<number>(asc.length)
    let lvl = drug.inventory_count // level after the newest event
    for (let i = asc.length - 1; i >= 0; i--) {
      levels[i] = lvl
      lvl -= asc[i].delta // level after the previous event
    }
    result.set(drugId, {
      drug_id: drugId,
      drug_name: drug.name,
      unit,
      current: drug.inventory_count,
      points: asc.map((tx, i) => ({
        date: localDayKey(new Date(tx.created_at)),
        level: levels[i],
        delta: tx.delta,
        kind: tx.kind,
      })),
    })
  }
  return result
}

/** Inventory level at the end of the given local day (level after the latest event
 * on or before that day). Falls back to the pre-window level if the day predates
 * all loaded events, or `current` when the drug has no events. */
export function levelAtEndOfDay(series: DrugLevelSeries, dayKey: string): number {
  if (series.points.length === 0) return series.current
  let result = series.points[0].level - series.points[0].delta // level before the first event
  for (const p of series.points) {
    if (p.date <= dayKey) result = p.level
    else break
  }
  return result
}
