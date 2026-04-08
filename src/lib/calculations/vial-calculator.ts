import type { CycleDrug, CycleCell, Drug, DrugInventoryDelta } from '@/types'

interface DrugWithInventory {
  id: string
  name: string
  concentration: number
  primary_category: string
  ester_type: string | null
  template_id?: string | null
  inventory_count: number
  tabs_per_box?: number | null
}

interface CycleDrugWithDrug extends Omit<CycleDrug, 'drug'> {
  drug: DrugWithInventory
}

const ML_PER_VIAL = 10
const DEFAULT_TABS_PER_BOX = 100

/**
 * Calculate total ml needed for an injectable drug across a cycle
 */
export function calculateTotalMl(cycleDrug: CycleDrugWithDrug): number {
  const { drug } = cycleDrug

  // E3D: any category (e.g. HCG is PCT + E3D)
  if (drug.ester_type === 'E3D' && cycleDrug.injection_ml && cycleDrug.total_injections) {
    return Math.round(cycleDrug.injection_ml * cycleDrug.total_injections * 100) / 100
  }

  if (drug.primary_category !== 'Injectable' || !cycleDrug.weekly_dose) return 0
  const weeks = cycleDrug.end_week - cycleDrug.start_week + 1

  if (drug.ester_type === 'Long') {
    // 2 injections per week
    const mlPerInjection = cycleDrug.weekly_dose / 2 / drug.concentration
    return Math.round(mlPerInjection * 2 * weeks * 100) / 100
  } else if (drug.ester_type === 'Short') {
    // 3.5 injections per week
    const mlPerInjection = cycleDrug.weekly_dose / 3.5 / drug.concentration
    return Math.round(mlPerInjection * 3.5 * weeks * 100) / 100
  }

  return 0
}

/**
 * Calculate total tablets needed for an oral/PCT drug across a cycle
 */
export function calculateTotalTablets(cycleDrug: CycleDrugWithDrug): number {
  const { drug } = cycleDrug
  if (drug.primary_category !== 'Oral' && drug.primary_category !== 'PCT') return 0
  const weeks = cycleDrug.end_week - cycleDrug.start_week + 1
  const mode = cycleDrug.schedule_mode || 'daily'

  if (mode === 'split_weekly' && cycleDrug.weekly_dose) {
    // weekly_dose stores total mg per week, convert to tablets
    const tabletsPerWeek = cycleDrug.weekly_dose / drug.concentration
    return Math.round(tabletsPerWeek * weeks * 100) / 100
  }

  if (!cycleDrug.daily_dose) return 0
  const tabletsPerDay = cycleDrug.daily_dose / drug.concentration

  if (mode === 'eod') {
    // 3.5 doses per week average
    return Math.round(tabletsPerDay * 3.5 * weeks * 100) / 100
  }

  // daily: 7 doses per week
  return Math.round(tabletsPerDay * 7 * weeks * 100) / 100
}

/**
 * Calculate vials needed for an injectable drug
 */
export function calculateVialsNeeded(totalMl: number): number {
  return Math.ceil(totalMl / ML_PER_VIAL)
}

/**
 * Calculate boxes needed for an oral drug
 */
export function calculateBoxesNeeded(totalTablets: number, tabsPerBox: number | null | undefined): number {
  return Math.ceil(totalTablets / (tabsPerBox || DEFAULT_TABS_PER_BOX))
}

/**
 * Calculate inventory delta for all drugs in a cycle.
 * When allDrugs is provided, drugs with the same template_id + concentration
 * share pooled inventory (different brands of the same drug).
 */
export function calculateInventoryDeltas(
  cycleDrugs: CycleDrugWithDrug[],
  allDrugs?: DrugWithInventory[]
): DrugInventoryDelta[] {
  const drugMap = new Map<string, { totalAmount: number; drug: DrugWithInventory; vialCount?: number }>()

  for (const cd of cycleDrugs) {
    const isE3D = cd.drug.ester_type === 'E3D'
    if (cd.drug.primary_category === 'Injectable' || isE3D) {
      const existing = drugMap.get(cd.drug_id) || { totalAmount: 0, drug: cd.drug }
      existing.totalAmount += calculateTotalMl(cd)
      if (isE3D && cd.vial_count) existing.vialCount = (existing.vialCount || 0) + cd.vial_count
      drugMap.set(cd.drug_id, existing)
    } else if (cd.drug.primary_category === 'Oral' || cd.drug.primary_category === 'PCT') {
      const existing = drugMap.get(cd.drug_id) || { totalAmount: 0, drug: cd.drug }
      existing.totalAmount += calculateTotalTablets(cd)
      drugMap.set(cd.drug_id, existing)
    }
  }

  // Build inventory pool: template_id:concentration → total inventory
  const poolMap = new Map<string, number>()
  if (allDrugs) {
    for (const d of allDrugs) {
      if (!d.template_id) continue
      const key = `${d.template_id}:${d.concentration}`
      poolMap.set(key, (poolMap.get(key) || 0) + d.inventory_count)
    }
  }

  // Sort: Injectable → Oral → PCT (E3D drugs always count as PCT)
  const categoryOrder: Record<string, number> = { Injectable: 0, Oral: 1, PCT: 2 }
  const resolveCategory = (drug: DrugWithInventory) =>
    drug.ester_type === 'E3D' ? 'PCT' : drug.primary_category
  const sortedEntries = Array.from(drugMap.entries()).sort(
    ([, a], [, b]) => (categoryOrder[resolveCategory(a.drug)] ?? 9) - (categoryOrder[resolveCategory(b.drug)] ?? 9)
  )

  return sortedEntries.map(([drugId, { totalAmount, drug, vialCount }]) => {
    const isE3D = drug.ester_type === 'E3D'
    const isOral = !isE3D && (drug.primary_category === 'Oral' || drug.primary_category === 'PCT')

    // E3D: use user-specified vial_count directly; fallback to ceil(totalMl / 10)
    const neededUnits = isOral
      ? calculateBoxesNeeded(totalAmount, drug.tabs_per_box)
      : isE3D
        ? (vialCount || calculateVialsNeeded(totalAmount))
        : calculateVialsNeeded(totalAmount)

    // Use pooled inventory when available, otherwise individual
    const poolKey = drug.template_id ? `${drug.template_id}:${drug.concentration}` : null
    const inventory = (poolKey && poolMap.has(poolKey))
      ? poolMap.get(poolKey)!
      : drug.inventory_count

    return {
      drug_id: drugId,
      drug_name: drug.name,
      category: resolveCategory(drug) as 'Injectable' | 'Oral' | 'PCT',
      ester_type: (drug.ester_type as any) || null,
      needed_ml: Math.round(totalAmount * 100) / 100,
      needed_vials: neededUnits,
      current_inventory: inventory,
      tabs_per_box: drug.tabs_per_box ?? null,
      deficit: isOral
        ? inventory - Math.round(totalAmount)  // oral: total tablets vs total tablets
        : inventory - neededUnits,              // injectable: vials vs vials
    }
  })
}

/**
 * Calculate weekly usage for a specific drug in a specific week
 */
export function calculateWeeklyUsage(
  cycleDrug: CycleDrugWithDrug,
  weekNumber: number
): { totalMl: number; totalMg: number } {
  const { drug } = cycleDrug

  if (weekNumber < cycleDrug.start_week || weekNumber > cycleDrug.end_week) {
    return { totalMl: 0, totalMg: 0 }
  }

  // E3D: any category (e.g. HCG is PCT + E3D)
  if (drug.ester_type === 'E3D' && cycleDrug.injection_ml) {
    const absStart = (cycleDrug.start_week - 1) * 7 + 1
    const maxInj = cycleDrug.total_injections || 0
    let injectionsThisWeek = 0
    let count = 0
    for (let absDay = absStart; count < maxInj; absDay += 3) {
      const w = Math.ceil(absDay / 7)
      if (w === weekNumber) injectionsThisWeek++
      if (w > weekNumber) break
      count++
    }
    const mlThisWeek = cycleDrug.injection_ml * injectionsThisWeek
    return {
      totalMl: Math.round(mlThisWeek * 100) / 100,
      totalMg: Math.round(mlThisWeek * drug.concentration * 100) / 100,
    }
  }

  if (drug.primary_category === 'Injectable' && cycleDrug.weekly_dose) {
    if (drug.ester_type === 'Long') {
      const mlPerWeek = cycleDrug.weekly_dose / drug.concentration
      return {
        totalMl: Math.round(mlPerWeek * 100) / 100,
        totalMg: cycleDrug.weekly_dose,
      }
    } else if (drug.ester_type === 'Short') {
      const mlPerInjection = cycleDrug.weekly_dose / 3.5 / drug.concentration
      const weekOffset = weekNumber - cycleDrug.start_week
      const injectionsThisWeek = weekOffset % 2 === 0 ? 4 : 3
      const mlThisWeek = mlPerInjection * injectionsThisWeek
      const mgThisWeek = (cycleDrug.weekly_dose / 3.5) * injectionsThisWeek
      return {
        totalMl: Math.round(mlThisWeek * 100) / 100,
        totalMg: Math.round(mgThisWeek * 100) / 100,
      }
    }
  }

  return { totalMl: 0, totalMg: 0 }
}

/**
 * Adjust inventory deltas by subtracting skipped cells
 */
export function adjustDeltasForSkippedCells(
  baseDeltas: DrugInventoryDelta[],
  cells: CycleCell[],
  cycleDrugs: CycleDrugWithDrug[]
): DrugInventoryDelta[] {
  // Sum skipped amounts per drug_id
  const skippedByDrugId = new Map<string, number>()

  for (const cell of cells) {
    if (!cell.is_skipped) continue
    const cd = cycleDrugs.find((d) => d.id === cell.cycle_drug_id)
    if (!cd) continue

    const drugId = cd.drug_id
    const existing = skippedByDrugId.get(drugId) || 0

    if (cd.drug?.primary_category === 'Injectable') {
      skippedByDrugId.set(drugId, existing + (cell.ml_amount || 0))
    } else {
      // Oral/PCT: count skipped tablets
      const tabletsPerDay = (cd.daily_dose || 0) / (cd.drug?.concentration || 1)
      skippedByDrugId.set(drugId, existing + tabletsPerDay)
    }
  }

  return baseDeltas.map((d) => {
    const skippedAmount = skippedByDrugId.get(d.drug_id) || 0
    if (skippedAmount === 0) return d

    const adjustedNeededMl = Math.round((d.needed_ml - skippedAmount) * 100) / 100
    const isE3D = d.ester_type === 'E3D'
    const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
    const adjustedUnits = isOral
      ? calculateBoxesNeeded(adjustedNeededMl, d.tabs_per_box)
      : calculateVialsNeeded(adjustedNeededMl)

    return {
      ...d,
      needed_ml: adjustedNeededMl,
      needed_vials: adjustedUnits,
      deficit: isOral
        ? d.current_inventory - Math.round(adjustedNeededMl)
        : d.current_inventory - adjustedUnits,
    }
  })
}
