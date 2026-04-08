import ExcelJS from 'exceljs'
import { formatOralInventory, getDayLabels, groupDeltasByCategory } from '@/lib/utils'
import type { CycleCell, DrugInventoryDelta } from '@/types'


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
  startDate?: string | null
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
    for (let day = 1; day <= 7; day++) {
      const entries = cellMap.get(`${week}-${day}`) || []
      maxEntries = Math.max(maxEntries, entries.length)

      const cellRef = row.getCell(day + 1)
      if (entries.length > 0) {
        cellRef.value = buildRichText(entries, colWidths[day])
      }
      cellRef.alignment = { wrapText: true, vertical: 'top' }
      cellRef.border = THIN_BORDER
    }

    row.height = Math.max(LINE_HEIGHT * maxEntries + 4, LINE_HEIGHT + 4)

    // Week column
    const weekCell = row.getCell(1)
    weekCell.font = WEEK_FONT
    weekCell.alignment = { horizontal: 'center', vertical: 'middle' }
    weekCell.border = THIN_BORDER
  }

  // --- Drug Stats Table (spans columns 1-8 like the schedule) ---
  if (deltas && deltas.length > 0) {
    ws.addRow([]) // blank row

    const titleRow = ws.addRow([])
    titleRow.getCell(1).value = 'Drug Stats'
    titleRow.getCell(1).font = { bold: true, size: 16 }
    ws.mergeCells(titleRow.number, 1, titleRow.number, 8)

    // Column headers: 藥物 (cols 1-4), 需求量 (cols 5-8)
    const colHdrRow = ws.addRow([])
    colHdrRow.getCell(1).value = '藥物'
    colHdrRow.getCell(5).value = '需求量'
    ws.mergeCells(colHdrRow.number, 1, colHdrRow.number, 4)
    ws.mergeCells(colHdrRow.number, 5, colHdrRow.number, 8)
    for (let c = 1; c <= 8; c++) {
      const cell = colHdrRow.getCell(c)
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = THIN_BORDER
    }

    const groups = groupDeltasByCategory(deltas)
    for (const group of groups) {
      // Category header row — merged across full width, centered, with background
      const catRow = ws.addRow([])
      catRow.getCell(1).value = group.label
      ws.mergeCells(catRow.number, 1, catRow.number, 8)
      catRow.getCell(1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF555555' } }
      catRow.getCell(1).fill = CAT_FILL
      catRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      for (let c = 1; c <= 8; c++) catRow.getCell(c).border = THIN_BORDER

      for (const d of group.items) {
        const isE3D = d.ester_type === 'E3D'
        const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
        const needed = isOral
          ? `${Math.round(d.needed_ml)} 顆 (${formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box)})`
          : isE3D
            ? `${d.needed_vials} 瓶/劑`
            : `${d.needed_ml} ml (${d.needed_vials} 瓶)`
        const dataRow = ws.addRow([])
        dataRow.getCell(1).value = d.drug_name
        dataRow.getCell(5).value = needed
        ws.mergeCells(dataRow.number, 1, dataRow.number, 4)
        ws.mergeCells(dataRow.number, 5, dataRow.number, 8)
        for (let c = 1; c <= 8; c++) {
          const cell = dataRow.getCell(c)
          cell.font = BODY_FONT
          cell.border = THIN_BORDER
          cell.alignment = { vertical: 'middle' }
        }
      }
    }
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
