import type { CycleCell, CycleDrug, Supply, CycleSupply, SupplySummary } from '@/types'

/**
 * Count non-skipped CycleCells that belong to an Injectable cycle_drug.
 * `excludeE3D` drops HCG-style drugs (ester_type 'E3D'), which are injected with an
 * insulin needle and must not inflate the 23G/24G needle/syringe counts.
 */
export function countInjectionEvents(
  cells: CycleCell[],
  cycleDrugs: CycleDrug[],
  opts?: { excludeE3D?: boolean }
): number {
  const injectableCdIds = new Set(
    cycleDrugs
      .filter(
        (cd) =>
          cd.drug?.primary_category === 'Injectable' &&
          (!opts?.excludeE3D || cd.drug?.ester_type !== 'E3D')
      )
      .map((cd) => cd.id)
  )
  return cells.filter(
    (c) => !c.is_skipped && c.cycle_drug_id && injectableCdIds.has(c.cycle_drug_id)
  ).length
}

export function computeSupplyQuantity(
  supply: Supply,
  totalWeeks: number,
  allInjectionCount: number,
  steroidInjectionCount: number
): number {
  const v = Number(supply.rule_value) || 0
  switch (supply.rule_type) {
    case 'per_injection': {
      const n = supply.injection_basis === 'steroid' ? steroidInjectionCount : allInjectionCount
      return Math.ceil(n * v)
    }
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
  overrides: Record<string, number | null>,
  supplies: Supply[],
  totalWeeks: number,
  allInjectionCount: number,
  steroidInjectionCount: number
): SupplySummary[] {
  // Iterate `supplies` (already sorted by display_order) and pick out the
  // selected ones, so the output order in the export matches the order the
  // user dragged in the dialog. `overrides` is a per-export local map keyed
  // by supply_id; if a supply has an entry in `overrides` it wins over the
  // auto-computed quantity. Override values are not persisted to DB — the
  // caller (cycle-export-dialog) owns this transient state.
  const selectedIds = new Set(selected.map((cs) => cs.supply_id))
  const summaries: SupplySummary[] = []
  for (const s of supplies) {
    if (!selectedIds.has(s.id)) continue
    const auto = computeSupplyQuantity(s, totalWeeks, allInjectionCount, steroidInjectionCount)
    const ov = overrides[s.id]
    summaries.push({
      name: s.name,
      unit: s.unit,
      quantity: ov !== undefined && ov !== null ? ov : auto,
    })
  }
  return summaries
}
