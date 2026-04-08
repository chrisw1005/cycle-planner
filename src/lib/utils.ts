import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function formatOralInventory(totalTablets: number, tabsPerBox: number | null): string {
  if (!tabsPerBox || tabsPerBox <= 0) return `${totalTablets} 顆`
  const boxes = Math.floor(totalTablets / tabsPerBox)
  const remaining = totalTablets % tabsPerBox
  if (boxes === 0) return `${remaining} 顆`
  if (remaining === 0) return `${boxes} 盒`
  return `${boxes} 盒 ${remaining} 顆`
}
