import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DrugInventoryDelta } from '@/types'

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
