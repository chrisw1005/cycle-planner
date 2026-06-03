import ExcelJS from 'exceljs'
import { formatOralInventory, getDayLabels, groupDeltasByCategory } from '@/lib/utils'
import type { CycleCell, DrugInventoryDelta, SupplySummary } from '@/types'


const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF282828' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  bold: true,
  size: 16,
  color: { argb: 'FFFFFFFF' },
}
const WEEK_FONT: Partial<ExcelJS.Font> = { name: 'Calibri', size: 15, bold: true }
const NAME_FONT: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1A1A1A' } }
const DOSE_FONT: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, color: { argb: 'FF888888' } }
const BODY_FONT: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14 }
const CAT_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8E8E8' },
}
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

// Split "DrugName 0.8ml" into [name, dose] or null
function splitDrugEntry(v: string): [string, string] | null {
  const match = v.match(/^(.+?)\s+(\d[\d.]*\s*(?:ml|mg|IU|mcg).*)$/i)
  return match ? [match[1], match[2]] : null
}

// Build rich text for a cell: each entry as name (bold dark) + padded dose (gray), separated by newlines
function buildRichText(entries: string[], colChars: number): ExcelJS.CellRichTextValue {
  const richText: ExcelJS.RichText[] = []
  // Calibri 14 is wider than Calibri 11 (Excel default width unit), scale down usable chars
  const usableChars = Math.floor(colChars * 0.6)
  entries.forEach((entry, i) => {
    if (i > 0) richText.push({ text: '\n' })
    const parts = splitDrugEntry(entry)
    if (parts) {
      const gap = Math.max(2, usableChars - parts[0].length - parts[1].length)
      richText.push({ font: NAME_FONT, text: parts[0] })
      richText.push({ font: DOSE_FONT, text: ' '.repeat(gap) + parts[1] })
    } else {
      richText.push({ font: NAME_FONT, text: entry })
    }
  })
  return { richText }
}

export function exportScheduleToXLSX(
  cycleName: string,
  personName: string,
  totalWeeks: number,
  cells: CycleCell[],
  deltas?: DrugInventoryDelta[],
  startDate?: string | null,
  supplies?: SupplySummary[]
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(cycleName || 'Cycle')

  // Build cell map
  const cellMap = new Map<string, string[]>()
  for (const cell of cells) {
    if (cell.is_skipped) continue
    const key = `${cell.week_number}-${cell.day_of_week}`
    if (!cellMap.has(key)) cellMap.set(key, [])
    if (cell.display_value) cellMap.get(key)!.push(cell.display_value)
  }

  // --- Schedule Table ---
  // Header row
  const dayLabels = getDayLabels(startDate)
  const headerRow = ws.addRow(['Week', ...dayLabels])
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  const LINE_HEIGHT = 20

  // Pre-calculate column widths from cellMap so buildRichText can pad entries
  const colWidths: number[] = [14] // index 0 = Week column (wider for "Week XX")
  for (let day = 1; day <= 7; day++) {
    let maxLen = dayLabels[day - 1].length
    for (let week = 1; week <= totalWeeks; week++) {
      const entries = cellMap.get(`${week}-${day}`) || []
      for (const entry of entries) {
        maxLen = Math.max(maxLen, entry.length)
      }
    }
    colWidths.push(Math.max(maxLen * 1.5 + 2, 18))
  }

  // Apply column widths
  for (let c = 0; c < colWidths.length; c++) {
    ws.getColumn(c + 1).width = colWidths[c]
  }

  // Data rows
  for (let week = 1; week <= totalWeeks; week++) {
    const row = ws.addRow([`Week ${week}`])

    // Find max entries in any day this week for row height
    let maxEntries = 0
    let minEntries = Infinity
    for (let day = 1; day <= 7; day++) {
      const entries = cellMap.get(`${week}-${day}`) || []
      maxEntries = Math.max(maxEntries, entries.length)
      minEntries = Math.min(minEntries, entries.length)

      const cellRef = row.getCell(day + 1)
      if (entries.length > 0) {
        cellRef.value = buildRichText(entries, colWidths[day])
      }
      cellRef.alignment = { wrapText: true, vertical: 'top' }
      cellRef.border = THIN_BORDER
    }

    // When every day cell carries the same non-zero entry count, the row fits
    // tight with no breathing space — pad with one extra line.
    const tightRow = maxEntries > 0 && minEntries === maxEntries
    const heightLines = tightRow ? maxEntries + 1 : maxEntries
    row.height = Math.max(LINE_HEIGHT * heightLines + 4, LINE_HEIGHT + 4)

    // Week column
    const weekCell = row.getCell(1)
    weekCell.font = WEEK_FONT
    weekCell.alignment = { horizontal: 'center', vertical: 'middle' }
    weekCell.border = THIN_BORDER
  }

  // --- Drug Stats + Supplies Tables (side by side: drug stats cols 1-6, supplies cols 9-12) ---
  const hasDeltas = !!deltas && deltas.length > 0
  const hasSupplies = !!supplies && supplies.length > 0

  let titleRowNum: number | null = null
  let headerRowNum: number | null = null

  if (hasDeltas || hasSupplies) {
    ws.addRow([]) // blank row gap

    const titleRow = ws.addRow([])
    titleRowNum = titleRow.number

    if (hasDeltas) {
      titleRow.getCell(1).value = 'Drug Stats'
      titleRow.getCell(1).font = { bold: true, size: 16 }
      ws.mergeCells(titleRowNum, 1, titleRowNum, 6)
    }
    if (hasSupplies) {
      titleRow.getCell(9).value = '其他'
      titleRow.getCell(9).font = { bold: true, size: 16 }
      titleRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.mergeCells(titleRowNum, 9, titleRowNum, 12)
    }

    const colHdrRow = ws.addRow([])
    headerRowNum = colHdrRow.number

    if (hasDeltas) {
      colHdrRow.getCell(1).value = '藥物'
      colHdrRow.getCell(4).value = '需求量'
      ws.mergeCells(headerRowNum, 1, headerRowNum, 3)
      ws.mergeCells(headerRowNum, 4, headerRowNum, 6)
      for (let c = 1; c <= 6; c++) {
        const cell = colHdrRow.getCell(c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = THIN_BORDER
      }
    }
    if (hasSupplies) {
      colHdrRow.getCell(9).value = '用具'
      colHdrRow.getCell(11).value = '數量'
      ws.mergeCells(headerRowNum, 9, headerRowNum, 10)
      ws.mergeCells(headerRowNum, 11, headerRowNum, 12)
      for (let c = 9; c <= 12; c++) {
        const cell = colHdrRow.getCell(c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = THIN_BORDER
      }
    }
  }

  if (hasDeltas) {
    const groups = groupDeltasByCategory(deltas!)
    for (const group of groups) {
      // Category header row — merged across 6 columns, centered, with background
      const catRow = ws.addRow([])
      catRow.getCell(1).value = group.label
      ws.mergeCells(catRow.number, 1, catRow.number, 6)
      catRow.getCell(1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF555555' } }
      catRow.getCell(1).fill = CAT_FILL
      catRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      for (let c = 1; c <= 6; c++) catRow.getCell(c).border = THIN_BORDER

      for (const d of group.items) {
        const isE3D = d.ester_type === 'E3D'
        const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
        const needed = isOral
          ? `${Math.round(d.needed_ml)} 顆 (${formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box, d.package_unit ?? '盒')})`
          : isE3D
            ? `${d.needed_vials} 瓶/劑`
            : `${d.needed_ml} ml (${d.needed_vials} 瓶)`
        const dataRow = ws.addRow([])
        dataRow.getCell(1).value = d.drug_name
        dataRow.getCell(4).value = needed
        ws.mergeCells(dataRow.number, 1, dataRow.number, 3)
        ws.mergeCells(dataRow.number, 4, dataRow.number, 6)
        for (let c = 1; c <= 6; c++) {
          const cell = dataRow.getCell(c)
          cell.font = BODY_FONT
          cell.border = THIN_BORDER
          cell.alignment = { vertical: 'middle' }
        }
        // 需求量靠右
        dataRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      }
    }
  }

  // --- Supplies block (cols 9-12) ---
  // Write to existing rows starting from headerRowNum + 1 so it sits beside drug stats.
  // If supplies extend past drug-stats rows, fill cells in subsequent rows directly.
  if (hasSupplies && headerRowNum !== null) {
    supplies!.forEach((s, i) => {
      const targetRowNum = headerRowNum! + 1 + i
      // Ensure the row exists (drug stats may have created it; if not, addRow up to it)
      while (ws.rowCount < targetRowNum) ws.addRow([])
      const row = ws.getRow(targetRowNum)
      row.getCell(9).value = s.name
      row.getCell(11).value = `${s.quantity} ${s.unit}`
      ws.mergeCells(targetRowNum, 9, targetRowNum, 10)
      ws.mergeCells(targetRowNum, 11, targetRowNum, 12)
      for (let c = 9; c <= 12; c++) {
        const cell = row.getCell(c)
        cell.font = BODY_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: 'middle' }
      }
      row.getCell(9).font = NAME_FONT
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' }
    })

    // Set widths for cols 9-12
    ws.getColumn(9).width = 18
    ws.getColumn(10).width = 4
    ws.getColumn(11).width = 12
    ws.getColumn(12).width = 4
  }

  // Save
  wb.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${personName}_${cycleName || 'cycle'}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  })
}
