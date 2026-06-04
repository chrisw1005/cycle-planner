import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { formatOralInventory, groupDeltasByCategory, oralDeficitPackages } from '@/lib/utils'
import type { DrugInventoryDelta } from '@/types'
import { loadCJKFont } from './pdf-fonts'

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF282828' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' },
}
const CAT_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' },
}
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' },
}

function filterShortage(deltas: DrugInventoryDelta[]): DrugInventoryDelta[] {
  return deltas.filter((d) => d.deficit < 0)
}

export async function exportDeficitsToXLSX(deltas: DrugInventoryDelta[], includeRemainder = false) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('藥物缺口')
  const rows = filterShortage(deltas)

  ws.columns = [
    // hidden: kept for re-import matching, but not shown so 藥物名稱 is the first visible column
    { key: 'drug_id', width: 38, hidden: true },
    { key: 'drug_name', width: 24 },
    { key: 'category', width: 12 },
    { key: 'ester_type', width: 10 },
    { key: 'current_inventory', width: 14 },
    { key: 'needed', width: 14 },
    { key: 'deficit', width: 12 },
    { key: 'new_inventory', width: 16 },
  ]

  const headerRow = ws.addRow([
    'drug_id', '藥物名稱', '分類', '酯類', '現有庫存', '需求', '缺口', '新庫存（填寫此欄）',
  ])
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  const groups = groupDeltasByCategory(rows)
  for (const group of groups) {
    const catRow = ws.addRow([group.label])
    ws.mergeCells(catRow.number, 1, catRow.number, 8)
    catRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF555555' } }
    catRow.getCell(1).fill = CAT_FILL
    catRow.getCell(1).alignment = { horizontal: 'center' }
    for (let c = 1; c <= 8; c++) catRow.getCell(c).border = THIN_BORDER

    for (const d of group.items) {
      const isE3D = d.ester_type === 'E3D'
      const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT' || d.category === 'Other')
      const unit = d.package_unit ?? '盒'
      const currentDisplay = isOral
        ? `${d.current_inventory} 顆 (${formatOralInventory(d.current_inventory, d.tabs_per_box, unit)})`
        : isE3D
          ? `${d.current_inventory} 瓶/劑`
          : `${d.current_inventory} 瓶`
      const neededDisplay = isOral
        ? `${Math.round(d.needed_ml)} 顆`
        : isE3D
          ? `${d.needed_vials} 瓶/劑`
          : `${d.needed_ml} ml (${d.needed_vials} 瓶)`
      const deficitDisplay = isOral
        ? `缺 ${oralDeficitPackages(d.deficit, d.tabs_per_box)} ${unit}${includeRemainder ? `（${Math.abs(d.deficit)} 顆）` : ''}`
        : isE3D
          ? `缺 ${Math.abs(d.deficit)} 瓶/劑`
          : `缺 ${Math.abs(d.deficit)} 瓶`

      const r = ws.addRow([
        d.drug_id,
        d.drug_name,
        d.category,
        d.ester_type ?? '',
        currentDisplay,
        neededDisplay,
        deficitDisplay,
        '',
      ])
      r.eachCell((cell) => {
        cell.border = THIN_BORDER
        cell.alignment = { vertical: 'middle' }
      })
    }
  }

  try {
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    link.download = `藥物缺口_${stamp}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to export deficits XLSX:', err)
    toast.error('匯出 XLSX 失敗', {
      description: err instanceof Error ? err.message : String(err),
    })
  }
}

type AutoTableCell =
  | string
  | number
  | {
      content: string
      colSpan?: number
      rowSpan?: number
      styles?: Record<string, unknown>
    }

export async function exportDeficitsToPDF(deltas: DrugInventoryDelta[], includeRemainder = false) {
  const rows = filterShortage(deltas)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const hasCJK = await loadCJKFont(doc)
  if (hasCJK) doc.setFont('NotoSansTC', 'normal')

  doc.setFontSize(16)
  doc.text('藥物缺口清單', 14, 16)
  doc.setFontSize(10)
  doc.text(`產生日期：${new Date().toLocaleDateString('zh-TW')}`, 14, 22)

  const body: AutoTableCell[][] = []
  const groups = groupDeltasByCategory(rows)
  for (const group of groups) {
    body.push([
      {
        content: group.label,
        colSpan: 5,
        styles: { fillColor: [232, 232, 232], fontStyle: 'bold', halign: 'center' },
      },
    ])
    for (const d of group.items) {
      const isE3D = d.ester_type === 'E3D'
      const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT' || d.category === 'Other')
      const unit = isOral ? '顆' : isE3D ? '瓶/劑' : '瓶'
      const pkgUnit = d.package_unit ?? '盒'
      const needed = isOral ? Math.round(d.needed_ml) : d.needed_vials
      const deficitText = isOral
        ? `缺 ${oralDeficitPackages(d.deficit, d.tabs_per_box)} ${pkgUnit}${includeRemainder ? `（${Math.abs(d.deficit)} 顆）` : ''}`
        : `缺 ${Math.abs(d.deficit)} ${unit}`
      body.push([
        d.drug_name,
        d.ester_type ?? '—',
        `${d.current_inventory} ${unit}`,
        `${needed} ${unit}`,
        deficitText,
      ])
    }
  }

  autoTable(doc, {
    startY: 28,
    head: [['藥物', '酯類', '現有', '需求', '缺口']],
    body,
    styles: { font: 'NotoSansTC', fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', textColor: [200, 40, 40] },
    },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`藥物缺口_${stamp}.pdf`)
}
