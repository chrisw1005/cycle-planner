import type { CycleCell, CycleDrug, Supply, CycleSupply, SupplySummary } from '@/types'

/** Count non-skipped CycleCells that belong to an Injectable cycle_drug. */
export function countInjectionEvents(cells: CycleCell[], cycleDrugs: CycleDrug[]): number {
  const injectableCdIds = new Set(
    cycleDrugs
      .filter((cd) => cd.drug?.primary_category === 'Injectable')
      .map((cd) => cd.id)
  )
  return cells.filter(
    (c) => !c.is_skipped && c.cycle_drug_id && injectableCdIds.has(c.cycle_drug_id)
  ).length
}

export function computeSupplyQuantity(
  supply: Supply,
  totalWeeks: number,
  injectionEventCount: number
): number {
  const v = Number(supply.rule_value) || 0
  switch (supply.rule_type) {
    case 'per_injection':
      return Math.ceil(injectionEventCount * v)
    case 'per_day':
      return Math.ceil(totalWeeks * 7 * v)
    case 'per_week':
      return Math.ceil(totalWeeks * v)
    case 'fixed':
      return Math.ceil(v)
  }
}

export function buildSupplySummaries(
  selected: CycleSupply[],
  supplies: Supply[],
  totalWeeks: number,
  injectionEventCount: number
): SupplySummary[] {
  const byId = new Map(supplies.map((s) => [s.id, s]))
  const summaries: SupplySummary[] = []
  for (const cs of selected) {
    const s = byId.get(cs.supply_id)
    if (!s) continue
    const auto = computeSupplyQuantity(s, totalWeeks, injectionEventCount)
    summaries.push({
      name: s.name,
      unit: s.unit,
      quantity: cs.override_quantity ?? auto,
    })
  }
  return summaries
}
