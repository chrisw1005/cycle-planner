import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatOralInventory, getDayLabels, groupDeltasByCategory } from '@/lib/utils'
import type { CycleCell, DrugInventoryDelta } from '@/types'
import { loadCJKFont } from './pdf-fonts'

// Split "DrugName 0.8ml" or "DrugName 30mg (3)" into [name, dose]
function splitDrugEntry(v: string): [string, string] | null {
  const match = v.match(/^(.+?)\s+(\d[\d.]*\s*(?:ml|mg|IU|mcg).*)$/i)
  return match ? [match[1], match[2]] : null
}

/** Truncate text to fit within maxWidth (mm), appending "..." if needed */
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  const ellipsis = '...'
  const ellipsisWidth = doc.getTextWidth(ellipsis)
  const targetWidth = maxWidth - ellipsisWidth
  if (targetWidth <= 0) return ellipsis
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (doc.getTextWidth(text.slice(0, mid)) <= targetWidth) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return text.slice(0, lo) + ellipsis
}

export async function exportScheduleToPDF(
  title: string,
  totalWeeks: number,
  cells: CycleCell[],
  deltas?: DrugInventoryDelta[],
  startDate?: string | null,
  includeTitle: boolean = true
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const hasCJK = await loadCJKFont(doc)
  const fontName = hasCJK ? 'NotoSansTC' : 'helvetica'

  // Build cell map: entries per (week, day)
  const cellMap = new Map<string, string[]>()
  for (const cell of cells) {
    if (cell.is_skipped) continue
    const key = `${cell.week_number}-${cell.day_of_week}`
    if (!cellMap.has(key)) cellMap.set(key, [])
    if (cell.display_value) cellMap.get(key)!.push(cell.display_value)
  }

  // Title (optional — still used in filename regardless)
  if (includeTitle) {
    doc.setFont(fontName, 'normal', 'bold')
    doc.setFontSize(18)
    doc.text(title, 14, 15)
  }

  // Schedule table — store real entries separately, pass placeholder text for row height calculation
  const headers = ['Week', ...getDayLabels(startDate)]
  const body: string[][] = []

  const fontSize = 9
  const shrunkDoseFontSize = 8
  const entrySpacing = 3.8 // mm between each drug entry
  const padding = 2
  const gap = 1.5
  const dayCellWidth = 37
  const weekColWidth = 18
  const dayContentWidth = dayCellWidth - 2 * padding
  const scheduleTableWidth = weekColWidth + 7 * dayCellWidth
  const pageWidth = doc.internal.pageSize.width
  const scheduleHMargin = Math.max(8, (pageWidth - scheduleTableWidth) / 2)

  interface EntryLayout {
    name: string
    dose: string
    wrapped: boolean
    doseFontSize: number
    hasParts: boolean
  }
  const entryLayoutsMap = new Map<string, EntryLayout[]>()

  // Pre-pass: measure each entry, decide whether to use normal/shrunk dose or 2-line wrap
  doc.setFontSize(fontSize)
  doc.setFont(fontName, 'normal', 'bold')

  for (let week = 1; week <= totalWeeks; week++) {
    const row = [`Week ${week}`]
    for (let day = 1; day <= 7; day++) {
      const entries = cellMap.get(`${week}-${day}`) || []
      const layouts: EntryLayout[] = []
      const displayLines: string[] = []

      for (const entry of entries) {
        const parts = splitDrugEntry(entry)
        if (parts) {
          const [name, dose] = parts

          doc.setFontSize(fontSize)
          const nameWidth = doc.getTextWidth(name)
          const doseWidthNormal = doc.getTextWidth(dose)

          // Tier 1: single line at normal font
          if (nameWidth + doseWidthNormal + gap <= dayContentWidth) {
            layouts.push({ name, dose, wrapped: false, doseFontSize: fontSize, hasParts: true })
            displayLines.push(entry)
            continue
          }

          // Tier 2: single line with shrunken dose font
          doc.setFontSize(shrunkDoseFontSize)
          const doseWidthShrunk = doc.getTextWidth(dose)
          doc.setFontSize(fontSize)
          if (nameWidth + doseWidthShrunk + gap <= dayContentWidth) {
            layouts.push({ name, dose, wrapped: false, doseFontSize: shrunkDoseFontSize, hasParts: true })
            displayLines.push(entry)
            continue
          }

          // Tier 3: wrap to two lines
          layouts.push({ name, dose, wrapped: true, doseFontSize: fontSize, hasParts: true })
          displayLines.push(`${name}\n${dose}`)
        } else {
          layouts.push({ name: entry, dose: '', wrapped: false, doseFontSize: fontSize, hasParts: false })
          displayLines.push(entry)
        }
      }

      entryLayoutsMap.set(`Week ${week}-${day}`, layouts)
      row.push(displayLines.join('\n'))
    }
    body.push(row)
  }

  autoTable(doc, {
    startY: includeTitle ? 22 : 10,
    head: [headers],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 10,
      halign: 'center',
      fontStyle: 'bold',
      font: fontName,
    },
    bodyStyles: {
      fontSize,
      cellPadding: { top: 3, right: padding, bottom: 3, left: padding },
      valign: 'top',
      lineWidth: 0.45,
      font: fontName,
      textColor: [200, 200, 200], // light placeholder text — overdrawn by didDrawCell
    },
    columnStyles: {
      0: { cellWidth: weekColWidth, halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: [20, 20, 20] },
      1: { cellWidth: dayCellWidth },
      2: { cellWidth: dayCellWidth },
      3: { cellWidth: dayCellWidth },
      4: { cellWidth: dayCellWidth },
      5: { cellWidth: dayCellWidth },
      6: { cellWidth: dayCellWidth },
      7: { cellWidth: dayCellWidth },
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'wrap',
      font: fontName,
    },
    margin: { left: scheduleHMargin, right: scheduleHMargin },
    didDrawCell: (data) => {
      // Only custom-draw body cells for day columns (not Week column)
      if (data.section !== 'body' || data.column.index === 0) return

      // Use raw row data for lookup — works for both normal and remainder (page-split) rows
      const rawRow = data.row.raw as string[]
      const weekLabel = rawRow[0]
      const layouts = entryLayoutsMap.get(`${weekLabel}-${data.column.index}`) || []
      if (layouts.length === 0) return

      // Clear autoTable's placeholder text
      doc.setFillColor(255, 255, 255)
      doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F')

      // Determine which lines belong to this cell portion.
      // When autoTable splits a row across pages, remainder rows have index === -1
      // and cell.text contains only the lines assigned to this page portion.
      const totalLines = layouts.reduce((sum, l) => sum + (l.wrapped ? 2 : 1), 0)
      const isRemainder = data.row.index === -1
      const cellTextLineCount = Array.isArray(data.cell.text) ? data.cell.text.length : totalLines
      const linesToSkip = isRemainder ? Math.max(0, totalLines - cellTextLineCount) : 0

      // Walk layouts to find the starting position after skipping lines
      let linesConsumed = 0
      let startLayoutIdx = 0
      let skipFirstLayoutName = false
      for (let i = 0; i < layouts.length; i++) {
        const layoutLines = layouts[i].wrapped ? 2 : 1
        if (linesConsumed + layoutLines <= linesToSkip) {
          linesConsumed += layoutLines
          startLayoutIdx++
        } else {
          skipFirstLayoutName = linesToSkip - linesConsumed >= 1
          break
        }
      }

      const x = data.cell.x + padding
      const xRight = data.cell.x + data.cell.width - padding
      let y = data.cell.y + 3 + fontSize * 0.35
      const cellBottom = data.cell.y + data.cell.height - 1
      const cellContentWidth = data.cell.width - 2 * padding

      doc.setFontSize(fontSize)

      for (let i = startLayoutIdx; i < layouts.length; i++) {
        if (y > cellBottom) break
        const l = layouts[i]
        const isFirst = i === startLayoutIdx

        if (l.hasParts) {
          if (l.wrapped) {
            const skipName = isFirst && skipFirstLayoutName
            if (!skipName) {
              doc.setFont(fontName, 'normal', 'bold')
              doc.setTextColor(20, 20, 20)
              doc.text(truncateText(doc, l.name, cellContentWidth), x, y)
              y += entrySpacing
              if (y > cellBottom) break
            }
            doc.setFont(fontName, 'normal', 'bold')
            doc.setTextColor(120, 120, 120)
            doc.text(l.dose, xRight, y, { align: 'right' })
            y += entrySpacing
          } else {
            doc.setFont(fontName, 'normal', 'bold')
            doc.setFontSize(fontSize)
            doc.setTextColor(20, 20, 20)
            doc.text(l.name, x, y)
            const restoreFont = l.doseFontSize !== fontSize
            if (restoreFont) doc.setFontSize(l.doseFontSize)
            doc.setTextColor(120, 120, 120)
            doc.text(l.dose, xRight, y, { align: 'right' })
            if (restoreFont) doc.setFontSize(fontSize)
            y += entrySpacing
          }
        } else {
          doc.setFont(fontName, 'normal', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(truncateText(doc, l.name, cellContentWidth), x, y)
          y += entrySpacing
        }
      }
    },
    didDrawPage: () => {
      doc.setFont(fontName)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(
        `Generated by Cycle Planner - ${new Date().toLocaleDateString('zh-TW')}`,
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 8,
        { align: 'right' }
      )
    },
  })

  // Drug stats table — placed on same page if room, else new page
  if (deltas && deltas.length > 0) {
    const statsHeaders = hasCJK ? ['藥物', '需求量'] : ['Drug', 'Needed']
    const groups = groupDeltasByCategory(deltas)
    const statsBody: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = []
    for (const group of groups) {
      // Category header row — spans both columns, centered
      statsBody.push([{
        content: group.label,
        colSpan: 2,
        styles: {
          halign: 'center' as const,
          fontStyle: 'bold' as const,
          fillColor: [240, 240, 240],
          textColor: [80, 80, 80],
        },
      }])
      for (const d of group.items) {
        const isE3D = d.ester_type === 'E3D'
        const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
        const needed = isOral
          ? `${Math.round(d.needed_ml)} ${hasCJK ? '顆' : 'tabs'} (${formatOralInventory(Math.round(d.needed_ml), d.tabs_per_box)})`
          : isE3D
            ? `${d.needed_vials} ${hasCJK ? '瓶/劑' : 'vials'}`
            : `${d.needed_ml} ml (${d.needed_vials} ${hasCJK ? '瓶' : 'vials'})`
        statsBody.push([d.drug_name, needed])
      }
    }

    // Estimate space needed — generous per-row height because bodyStyles fontSize is 10
    // and cellPadding is 2.5 each side (total row height ~8mm). Title ~10mm + header ~9mm + rows + buffer.
    const estimatedHeight = 10 + 9 + statsBody.length * 8 + 6
    const scheduleEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20
    const pageHeight = doc.internal.pageSize.height
    const footerReserve = 15 // footer + safe margin
    const available = pageHeight - scheduleEndY - footerReserve

    let titleY: number
    let tableStartY: number
    if (available >= estimatedHeight) {
      // Fits on current page — place below schedule with a small gap
      titleY = scheduleEndY + 10
      tableStartY = titleY + 5
    } else {
      doc.addPage()
      titleY = 15
      tableStartY = 20
    }

    doc.setFont(fontName, 'normal', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text(hasCJK ? '藥物用量統計' : 'Drug Stats', 14, titleY)

    autoTable(doc, {
      startY: tableStartY,
      head: [statsHeaders],
      body: statsBody,
      theme: 'grid',
      pageBreak: 'avoid', // keep the whole stats table together; if it won't fit, move to a new page
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: [255, 255, 255],
        fontSize: 10,
        halign: 'center',
        fontStyle: 'bold',
        font: fontName,
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 2.5,
        font: fontName,
        textColor: [20, 20, 20],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', textColor: [20, 20, 20] },
        1: { cellWidth: 60, halign: 'right', textColor: [100, 100, 100] },
      },
      styles: {
        font: fontName,
      },
      margin: { left: 10, right: 10 },
      tableWidth: 100,
    })
  }

  doc.save(`${title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`)
}
