import ExcelJS from 'exceljs'
import type { Drug } from '@/types'

export interface ParsedInventoryRow {
  drug_id: string
  drug_name: string
  current_inventory: number
  new_inventory: number
}

export interface ParseResult {
  rows: ParsedInventoryRow[]
  unmatched: { raw_id: string; raw_name: string; reason: string }[]
  skipped: number
}

/**
 * Parse an uploaded XLSX file into inventory updates.
 *
 * Resolution order:
 *   1. Match by drug_id (column A, UUID)
 *   2. Fallback: match by drug_name + category (columns B + C)
 *
 * Rows where new_inventory (column H) is blank or non-numeric are skipped.
 */
export async function parseDeficitXLSX(
  file: File,
  drugs: Drug[],
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('XLSX 不含任何工作表')

  const rows: ParsedInventoryRow[] = []
  const unmatched: ParseResult['unmatched'] = []
  let skipped = 0

  const byId = new Map(drugs.map((d) => [d.id, d]))
  const byNameCat = new Map(
    drugs.map((d) => [`${d.name.trim().toLowerCase()}::${d.primary_category}`, d]),
  )

  ws.eachRow({ includeEmpty: false }, (row, rowIdx) => {
    if (rowIdx === 1) return

    const rawId = String(row.getCell(1).value ?? '').trim()
    const rawName = String(row.getCell(2).value ?? '').trim()
    const rawCat = String(row.getCell(3).value ?? '').trim()
    const newInvCell = row.getCell(8).value

    if (!rawId && !rawName) return

    if (newInvCell === null || newInvCell === undefined || newInvCell === '') {
      skipped += 1
      return
    }

    const newInv = Number(newInvCell)
    if (!Number.isFinite(newInv) || newInv < 0) {
      unmatched.push({
        raw_id: rawId,
        raw_name: rawName,
        reason: `新庫存「${newInvCell}」非有效非負整數`,
      })
      return
    }

    let drug = rawId ? byId.get(rawId) : undefined
    if (!drug && rawName) {
      drug = byNameCat.get(`${rawName.toLowerCase()}::${rawCat}`)
    }
    if (!drug) {
      unmatched.push({
        raw_id: rawId,
        raw_name: rawName,
        reason: rawId
          ? '找不到對應 drug_id，且 name+分類 也無法比對'
          : '找不到名稱 + 分類組合',
      })
      return
    }

    rows.push({
      drug_id: drug.id,
      drug_name: drug.name,
      current_inventory: drug.inventory_count,
      new_inventory: Math.round(newInv),
    })
  })

  return { rows, unmatched, skipped }
}
