import { NOTE_PROSE_CSS } from '@/components/cycles/note-editor'
import { NOTE_PDF, type NotePageSlice } from './pdf-export'

export type { NotePageSlice }

const PX_PER_MM = 96 / 25.4 // CSS px per mm at 96dpi

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Convert cross-origin <img> sources to data URLs so html2canvas never taints
// the canvas (Supabase public URLs are CORS-enabled, but this is bulletproof).
async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) return
      try {
        const res = await fetch(src, { mode: 'cors' })
        if (!res.ok) return
        img.setAttribute('src', await blobToDataUrl(await res.blob()))
      } catch {
        // Leave original src; html2canvas useCORS may still capture it.
      }
    })
  )
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
    )
  )
}

/**
 * Rasterize note HTML into one-or-more page-height image slices sized to the
 * PDF's note content area. Returns [] when there is nothing to render or when
 * called outside the browser.
 */
export async function renderNoteToPageSlices(html: string): Promise<NotePageSlice[]> {
  if (typeof document === 'undefined' || !html.trim()) return []

  const widthPx = Math.round(NOTE_PDF.contentWidthMM * PX_PER_MM)
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${widthPx}px;background:#ffffff;`
  host.innerHTML = `<style>${NOTE_PROSE_CSS}</style><div class="note-prose" style="width:${widthPx}px;background:#fff;padding:6px 4px;">${html}</div>`
  document.body.appendChild(host)

  try {
    await inlineImages(host)
    await waitForImages(host)

    // Loaded lazily (browser-only) so the SSR/build pass never imports it.
    const { default: html2canvas } = await import('html2canvas-pro')
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })

    const mmPerPx = NOTE_PDF.contentWidthMM / canvas.width
    const fullHMM = canvas.height * mmPerPx

    if (fullHMM <= NOTE_PDF.sliceMaxHMM) {
      return [{ dataUrl: canvas.toDataURL('image/png'), hMM: fullHMM }]
    }

    const sliceMaxPx = Math.max(1, Math.floor(NOTE_PDF.sliceMaxHMM / mmPerPx))
    const slices: NotePageSlice[] = []
    for (let y = 0; y < canvas.height; y += sliceMaxPx) {
      const h = Math.min(sliceMaxPx, canvas.height - y)
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width
      tmp.height = h
      const ctx = tmp.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tmp.width, tmp.height)
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
      slices.push({ dataUrl: tmp.toDataURL('image/png'), hMM: h * mmPerPx })
    }
    return slices
  } finally {
    host.remove()
  }
}
