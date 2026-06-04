import type { CycleCell, CycleDrug, Drug } from '@/types'
import { calculateInventoryDeltas, adjustDeltasForSkippedCells } from './vial-calculator'

/**
 * Derive the effective skip set from saved cells (move-aware).
 *
 * A drag-move is persisted as a skipped+manual source cell paired with a
 * non-skipped manual target cell for the same cycle_drug. Those paired sources
 * are NOT real skips (the dose just moved), so they must be excluded. Mirrors the
 * reconstruction the cycle detail page does on load.
 */
export function deriveSavedSkipSet(cells: CycleCell[]): Set<string> {
  const set = new Set<string>()
  if (!cells?.length) return set

  const skippedManual = cells.filter((c) => c.is_skipped && c.is_manual_override)
  const movedTargets = cells.filter((c) => !c.is_skipped && c.is_manual_override)

  const pairedSourceKeys = new Set<string>()
  for (const source of skippedManual) {
    const target = movedTargets.find((t) => t.cycle_drug_id === source.cycle_drug_id)
    if (target) {
      pairedSourceKeys.add(`${source.cycle_drug_id}-${source.week_number}-${source.day_of_week}`)
    }
  }

  for (const c of cells) {
    const key = `${c.cycle_drug_id}-${c.week_number}-${c.day_of_week}`
    if (c.is_skipped && !pairedSourceKeys.has(key)) set.add(key)
  }
  return set
}

/**
 * Compute per-drug shipment units for a SAVED cycle (no unsaved local edits),
 * equivalent to what the detail page would deduct on completion. Units are vials
 * for injectable/E3D and tablets for oral/PCT/Other. Returns only positive items.
 */
export function computeShipmentItems(
  cycleDrugs: (CycleDrug & { drug: any })[],
  savedCells: CycleCell[],
  allDrugs: Drug[],
): { drug_id: string; units: number }[] {
  const skipSet = deriveSavedSkipSet(savedCells)
  const base = calculateInventoryDeltas(cycleDrugs as any, allDrugs as any)
  const cellsForAdjust = savedCells
    .filter((c) => skipSet.has(`${c.cycle_drug_id}-${c.week_number}-${c.day_of_week}`))
    .map((c) => ({ ...c, is_skipped: true }))
  const adjusted = adjustDeltasForSkippedCells(base, cellsForAdjust, cycleDrugs as any)

  return adjusted
    .map((d) => {
      const isE3D = d.ester_type === 'E3D'
      const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT' || d.category === 'Other')
      const units = isOral ? Math.round(d.needed_ml) : d.needed_vials
      return { drug_id: d.drug_id, units }
    })
    .filter((it) => it.units > 0)
}
