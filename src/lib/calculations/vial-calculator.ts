import type { CycleDrug, Drug, DrugInventoryDelta } from '@/types'

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
  } else if (drug.ester_type === 'E3D' && cycleDrug.injection_ml && cycleDrug.total_injections) {
    // E3D: fixed ml per injection × total injection count
    return Math.round(cycleDrug.injection_ml * cycleDrug.total_injections * 100) / 100
  }

  return 0
}

/**
 * Calculate total tablets needed for an oral/PCT drug across a cycle
 */
export function calculateTotalTablets(cycleDrug: CycleDrugWithDrug): number {
  const { drug } = cycleDrug
  if ((drug.primary_category !== 'Oral' && drug.primary_category !== 'PCT') || !cycleDrug.daily_dose) return 0
  const weeks = cycleDrug.end_week - cycleDrug.start_week + 1
  const tabletsPerDay = cycleDrug.daily_dose / drug.concentration
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
  const drugMap = new Map<string, { totalAmount: number; drug: DrugWithInventory }>()

  for (const cd of cycleDrugs) {
    if (cd.drug.primary_category === 'Injectable') {
      const existing = drugMap.get(cd.drug_id) || { totalAmount: 0, drug: cd.drug }
      existing.totalAmount += calculateTotalMl(cd)
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

  return Array.from(drugMap.entries()).map(([drugId, { totalAmount, drug }]) => {
    const isOral = drug.primary_category === 'Oral' || drug.primary_category === 'PCT'
    const neededUnits = isOral
      ? calculateBoxesNeeded(totalAmount, drug.tabs_per_box)
      : calculateVialsNeeded(totalAmount)

    // Use pooled inventory when available, otherwise individual
    const poolKey = drug.template_id ? `${drug.template_id}:${drug.concentration}` : null
    const inventory = (poolKey && poolMap.has(poolKey))
      ? poolMap.get(poolKey)!
      : drug.inventory_count

    return {
      drug_id: drugId,
      drug_name: drug.name,
      category: drug.primary_category as 'Injectable' | 'Oral' | 'PCT',
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

  if (drug.primary_category === 'Injectable' && cycleDrug.weekly_dose) {
    if (drug.ester_type === 'Long') {
      const mlPerWeek = cycleDrug.weekly_dose / drug.concentration
      return {
        totalMl: Math.round(mlPerWeek * 100) / 100,
        totalMg: cycleDrug.weekly_dose,
      }
    } else if (drug.ester_type === 'Short') {
      // EOD pattern: depends on whether this is odd or even week in pair
      const mlPerInjection = cycleDrug.weekly_dose / 3.5 / drug.concentration
      const weekOffset = weekNumber - cycleDrug.start_week
      const injectionsThisWeek = weekOffset % 2 === 0 ? 4 : 3 // Week N=4, Week N+1=3
      const mlThisWeek = mlPerInjection * injectionsThisWeek
      const mgThisWeek = (cycleDrug.weekly_dose / 3.5) * injectionsThisWeek
      return {
        totalMl: Math.round(mlThisWeek * 100) / 100,
        totalMg: Math.round(mgThisWeek * 100) / 100,
      }
    } else if (drug.ester_type === 'E3D' && cycleDrug.injection_ml) {
      // E3D: count actual injections in this week
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
  }

  return { totalMl: 0, totalMg: 0 }
}
