import type { CycleDrug, Drug, CycleCell, EsterType } from '@/types'
import { getDoseUnit } from '@/lib/utils'

interface DrugInfo {
  id: string
  name: string
  concentration: number
  primary_category: string
  ester_type: EsterType | null
  unit?: string
}

interface CellData {
  cycle_drug_id: string
  week_number: number
  day_of_week: number
  display_value: string
  ml_amount: number | null
  is_manual_override: boolean
  is_skipped: boolean
}

/** Strip trailing concentration number from drug name for compact display */
function shortName(name: string, concentration: number): string {
  // "TestE 300" + 300 → "TestE", "Tbol 10" + 10 → "Tbol"
  const suffix = ` ${concentration}`
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name
}

/**
 * Generate schedule cells for a cycle drug based on auto-calculation rules.
 *
 * Rule A: Long Ester Injectable → 2x/week on Day 1 & Day 4
 * Rule B: Short Ester Injectable → EOD alternating across 2 weeks
 * Rule C: Oral / PCT → daily dose on all 7 days
 */
export function generateCellsForDrug(
  cycleDrug: CycleDrug & { drug: DrugInfo },
  totalWeeks: number
): CellData[] {
  const { drug } = cycleDrug
  const cells: CellData[] = []

  if (drug.ester_type === 'E3D' && cycleDrug.injection_ml && cycleDrug.total_injections) {
    // Rule D: E3D — every 3 days, limited by total injection count (e.g. HCG)
    const mlPerInjection = roundMl(cycleDrug.injection_ml)
    const absStart = (cycleDrug.start_week - 1) * 7 + 1
    let count = 0

    for (let absDay = absStart; count < cycleDrug.total_injections; absDay += 3) {
      const week = Math.ceil(absDay / 7)
      if (week > totalWeeks) break
      const day = ((absDay - 1) % 7) + 1
      cells.push({
        cycle_drug_id: cycleDrug.id,
        week_number: week,
        day_of_week: day,
        display_value: `${shortName(drug.name, drug.concentration)} ${mlPerInjection}ml`,
        ml_amount: mlPerInjection,
        is_manual_override: false,
        is_skipped: false,
      })
      count++
    }
  } else if (drug.primary_category === 'Injectable' && cycleDrug.weekly_dose) {
    if (drug.ester_type === 'Long') {
      // Rule A: Long Ester — Day 1 & Day 4
      const perInjection = cycleDrug.weekly_dose / 2
      const mlPerInjection = roundMl(perInjection / drug.concentration)

      for (let week = cycleDrug.start_week; week <= Math.min(cycleDrug.end_week, totalWeeks); week++) {
        // Day 1 (Monday)
        cells.push({
          cycle_drug_id: cycleDrug.id,
          week_number: week,
          day_of_week: 1,
          display_value: `${shortName(drug.name, drug.concentration)} ${mlPerInjection}ml`,
          ml_amount: mlPerInjection,
          is_manual_override: false,
          is_skipped: false,
        })
        // Day 4 (Thursday)
        cells.push({
          cycle_drug_id: cycleDrug.id,
          week_number: week,
          day_of_week: 4,
          display_value: `${shortName(drug.name, drug.concentration)} ${mlPerInjection}ml`,
          ml_amount: mlPerInjection,
          is_manual_override: false,
          is_skipped: false,
        })
      }
    } else if (drug.ester_type === 'Short') {
      // Rule B: Short Ester — EOD alternating across 2 weeks
      // 3.5 injections per week → 7 injections per 2 weeks
      const perInjection = cycleDrug.weekly_dose / 3.5
      const mlPerInjection = roundMl(perInjection / drug.concentration)

      for (let week = cycleDrug.start_week; week <= Math.min(cycleDrug.end_week, totalWeeks); week += 2) {
        // Week N: Day 1, 3, 5, 7
        const weekNDays = [1, 3, 5, 7]
        for (const day of weekNDays) {
          if (week <= totalWeeks) {
            cells.push({
              cycle_drug_id: cycleDrug.id,
              week_number: week,
              day_of_week: day,
              display_value: `${shortName(drug.name, drug.concentration)} ${mlPerInjection}ml`,
              ml_amount: mlPerInjection,
              is_manual_override: false,
              is_skipped: false,
            })
          }
        }
        // Week N+1: Day 2, 4, 6
        const weekN1 = week + 1
        if (weekN1 <= Math.min(cycleDrug.end_week, totalWeeks)) {
          const weekN1Days = [2, 4, 6]
          for (const day of weekN1Days) {
            cells.push({
              cycle_drug_id: cycleDrug.id,
              week_number: weekN1,
              day_of_week: day,
              display_value: `${shortName(drug.name, drug.concentration)} ${mlPerInjection}ml`,
              ml_amount: mlPerInjection,
              is_manual_override: false,
              is_skipped: false,
            })
          }
        }
      }
    }
  } else if (
    (drug.primary_category === 'Oral' || drug.primary_category === 'PCT') &&
    (cycleDrug.daily_dose || cycleDrug.weekly_dose)
  ) {
    const mode = cycleDrug.schedule_mode || 'daily'
    const dUnit = getDoseUnit(drug.unit)
    const sName = shortName(drug.name, drug.concentration)

    if (mode === 'eod') {
      // Rule C2: EOD — every other day, alternating across 2 weeks (like Short ester pattern)
      const tabletsPerDay = roundTablets((cycleDrug.daily_dose || 0) / drug.concentration)
      const dose = cycleDrug.daily_dose || 0

      for (let week = cycleDrug.start_week; week <= Math.min(cycleDrug.end_week, totalWeeks); week += 2) {
        // Week N: Day 1, 3, 5, 7
        for (const day of [1, 3, 5, 7]) {
          if (week <= totalWeeks) {
            cells.push({
              cycle_drug_id: cycleDrug.id, week_number: week, day_of_week: day,
              display_value: `${sName} ${dose}${dUnit} (${tabletsPerDay})`,
              ml_amount: null, is_manual_override: false, is_skipped: false,
            })
          }
        }
        // Week N+1: Day 2, 4, 6
        const weekN1 = week + 1
        if (weekN1 <= Math.min(cycleDrug.end_week, totalWeeks)) {
          for (const day of [2, 4, 6]) {
            cells.push({
              cycle_drug_id: cycleDrug.id, week_number: weekN1, day_of_week: day,
              display_value: `${sName} ${dose}${dUnit} (${tabletsPerDay})`,
              ml_amount: null, is_manual_override: false, is_skipped: false,
            })
          }
        }
      }
    } else if (mode === 'split_weekly' && cycleDrug.weekly_dose) {
      // Rule C3: Split weekly — Day 1 & Day 4, total weekly tablets split evenly
      const weeklyTablets = cycleDrug.weekly_dose / drug.concentration
      const tabletsPerDose = roundTablets(weeklyTablets / 2)
      const dosePerDay = roundTablets(cycleDrug.weekly_dose / 2)

      for (let week = cycleDrug.start_week; week <= Math.min(cycleDrug.end_week, totalWeeks); week++) {
        for (const day of [1, 4]) {
          cells.push({
            cycle_drug_id: cycleDrug.id, week_number: week, day_of_week: day,
            display_value: `${sName} ${dosePerDay}${dUnit} (${tabletsPerDose})`,
            ml_amount: null, is_manual_override: false, is_skipped: false,
          })
        }
      }
    } else {
      // Rule C: Daily — dose on all 7 days (default)
      const tabletsPerDay = roundTablets((cycleDrug.daily_dose || 0) / drug.concentration)

      for (let week = cycleDrug.start_week; week <= Math.min(cycleDrug.end_week, totalWeeks); week++) {
        for (let day = 1; day <= 7; day++) {
          cells.push({
            cycle_drug_id: cycleDrug.id, week_number: week, day_of_week: day,
            display_value: `${sName} ${cycleDrug.daily_dose}${dUnit} (${tabletsPerDay})`,
            ml_amount: null, is_manual_override: false, is_skipped: false,
          })
        }
      }
    }
  }

  return cells
}

/**
 * Regenerate all cells for an entire cycle
 */
export function generateAllCells(
  cycleDrugs: (CycleDrug & { drug: DrugInfo })[],
  totalWeeks: number,
  existingManualOverrides?: CycleCell[]
): CellData[] {
  const allCells: CellData[] = []

  // Sort: Injectable → Oral → PCT (AI/SERM/Other)
  const sorted = [...cycleDrugs].sort((a, b) => {
    const order: Record<string, number> = { Injectable: 0, Oral: 1, PCT: 2 }
    return (order[a.drug.primary_category] ?? 9) - (order[b.drug.primary_category] ?? 9)
  })

  for (const cd of sorted) {
    const generated = generateCellsForDrug(cd, totalWeeks)
    allCells.push(...generated)
  }

  // Restore manual overrides
  if (existingManualOverrides?.length) {
    for (const override of existingManualOverrides) {
      const idx = allCells.findIndex(
        (c) =>
          c.cycle_drug_id === override.cycle_drug_id &&
          c.week_number === override.week_number &&
          c.day_of_week === override.day_of_week
      )
      if (idx >= 0) {
        allCells[idx] = {
          ...allCells[idx],
          display_value: override.display_value || allCells[idx].display_value,
          ml_amount: override.ml_amount,
          is_manual_override: override.is_manual_override,
          is_skipped: override.is_skipped ?? false,
        }
      } else if (override.is_manual_override && !override.is_skipped) {
        // Moved cell: exists at a non-generated position, add it
        allCells.push({
          cycle_drug_id: override.cycle_drug_id,
          week_number: override.week_number,
          day_of_week: override.day_of_week,
          display_value: override.display_value || '',
          ml_amount: override.ml_amount,
          is_manual_override: true,
          is_skipped: false,
        })
      }
    }
  }

  return allCells
}

/**
 * Calculate expected ml per injection for validation
 */
export function getExpectedMl(
  cycleDrug: CycleDrug & { drug: DrugInfo }
): number | null {
  const { drug } = cycleDrug

  // E3D: any category (e.g. HCG is PCT + E3D)
  if (drug.ester_type === 'E3D' && cycleDrug.injection_ml) {
    return roundMl(cycleDrug.injection_ml)
  }
  if (drug.primary_category !== 'Injectable' || !cycleDrug.weekly_dose) return null
  if (drug.ester_type === 'Long') {
    return roundMl(cycleDrug.weekly_dose / 2 / drug.concentration)
  } else if (drug.ester_type === 'Short') {
    return roundMl(cycleDrug.weekly_dose / 3.5 / drug.concentration)
  }
  return null
}

function roundMl(value: number): number {
  return Math.round(value * 100) / 100
}

function roundTablets(value: number): number {
  return Math.round(value * 10) / 10
}
