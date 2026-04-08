import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatOralInventory, getDayLabels, groupDeltasByCategory } from '@/lib/utils'
import type { CycleCell, DrugInventoryDelta } from '@/types'

let cachedRegular: string | null = null
let cachedBold: string | null = null

async function fontToBase64(url: string): Promise<string | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function loadCJKFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!cachedRegular) cachedRegular = await fontToBase64('/fonts/NotoSansTC.ttf')
    if (!cachedBold) cachedBold = await fontToBase64('/fonts/NotoSansTC-Bold.ttf')
    if (!cachedRegular) return false
    doc.addFileToVFS('NotoSansTC.ttf', cachedRegular)
    doc.addFont('NotoSansTC.ttf', 'NotoSansTC', 'normal')
    if (cachedBold) {
      doc.addFileToVFS('NotoSansTC-Bold.ttf', cachedBold)
      doc.addFont('NotoSansTC-Bold.ttf', 'NotoSansTC', 'bold')
    } else {
      // Fallback: register regular as bold if bold file unavailable
      doc.addFont('NotoSansTC.ttf', 'NotoSansTC', 'bold')
    }
    return true
  } catch {
    return false
  }
}

// Split "DrugName 0.8ml" or "DrugName 30mg (3)" into [name, dose]
function splitDrugEntry(v: string): [string, string] | null {
  const match = v.match(/^(.+?)\s+(\d[\d.]*\s*(?:ml|mg|IU|mcg).*)$/i)
  return match ? [match[1], match[2]] : null
}

export async function exportScheduleToPDF(
  title: string,
  totalWeeks: number,
  cells: CycleCell[],
  deltas?: DrugInventoryDelta[],
  startDate?: string | null
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

  // Title
  doc.setFont(fontName, 'normal', 'bold')
  doc.setFontSize(18)
  doc.text(title, 14, 15)

  // Schedule table — store real entries separately, pass placeholder text for row height calculation
  const headers = ['Week', ...getDayLabels(startDate)]
  const body: string[][] = []
  const entriesMap = new Map<string, string[]>() // "row-col" → entries

  for (let week = 1; week <= totalWeeks; week++) {
    const row = [`Week ${week}`]
    for (let day = 1; day <= 7; day++) {
      const entries = cellMap.get(`${week}-${day}`) || []
      entriesMap.set(`${week - 1}-${day}`, entries)
      // Pass actual text so autoTable calculates correct row height
      row.push(entries.join('\n'))
    }
    body.push(row)
  }

  const fontSize = 9
  const entrySpacing = 3.8 // mm between each drug entry
  const padding = 2

  autoTable(doc, {
    startY: 22,
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
      0: { cellWidth: 20, halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: [20, 20, 20] },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 35 },
      6: { cellWidth: 35 },
      7: { cellWidth: 35 },
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'wrap',
      font: fontName,
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      // Only custom-draw body cells for day columns (not Week column)
      if (data.section !== 'body' || data.column.index === 0) return

      const entries = entriesMap.get(`${data.row.index}-${data.column.index}`) || []
      if (entries.length === 0) return

      // Clear autoTable's text by drawing white rect over content area
      doc.setFillColor(255, 255, 255)
      doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F')

      const x = data.cell.x + padding
      const xRight = data.cell.x + data.cell.width - padding
      let y = data.cell.y + 3 + fontSize * 0.35

      doc.setFontSize(fontSize)

      for (const entry of entries) {
        const parts = splitDrugEntry(entry)
        if (parts) {
          // Drug name — bold dark, left aligned
          doc.setFont(fontName, 'normal', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(parts[0], x, y)
          // Dose — bold lighter gray, right aligned
          doc.setFont(fontName, 'normal', 'bold')
          doc.setTextColor(120, 120, 120)
          doc.text(parts[1], xRight, y, { align: 'right' })
        } else {
          doc.setFont(fontName, 'normal', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(entry, x, y)
        }
        y += entrySpacing
      }
    },
    didDrawPage: () => {
      doc.setFont(fontName)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(
        `Generated by Cycle Planner - ${new Date().toLocaleDateString('zh-TW')}`,
        14,
        doc.internal.pageSize.height - 8
      )
    },
  })

  // Drug stats table — on a new page
  if (deltas && deltas.length > 0) {
    doc.addPage()

    doc.setFont(fontName, 'normal', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text(hasCJK ? '藥物用量統計' : 'Drug Stats', 14, 15)

    const statsHeaders = hasCJK ? ['藥物', '需求量'] : ['Drug', 'Needed']
    const groups = groupDeltasByCategory(deltas)
    const statsBody: any[][] = []
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

    autoTable(doc, {
      startY: 20,
      head: [statsHeaders],
      body: statsBody,
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
        fontSize: 9,
        cellPadding: 2,
        font: fontName,
        textColor: [20, 20, 20],
      },
      columnStyles: {
        0: { cellWidth: 40 },
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
