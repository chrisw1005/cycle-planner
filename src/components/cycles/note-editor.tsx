'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Image } from '@tiptap/extension-image'
import { uploadDrugImage } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Underline, List, ListOrdered, ImagePlus, Loader2, Eraser } from 'lucide-react'
import { toast } from 'sonner'

// Shared prose styling — applied to the live editor AND reused when the note is
// rasterized for the PDF (see note-pdf.ts) so on-screen and exported look match.
export const NOTE_PROSE_CSS = `
.note-prose { color: #111827; font-size: 14px; line-height: 1.6; word-break: break-word; }
.note-prose p { margin: 0 0 0.5em; }
.note-prose p:last-child { margin-bottom: 0; }
.note-prose ul { list-style: disc; padding-left: 1.5em; margin: 0 0 0.5em; }
.note-prose ol { list-style: decimal; padding-left: 1.5em; margin: 0 0 0.5em; }
.note-prose li { margin: 0.1em 0; }
.note-prose li > p { margin: 0; }
.note-prose strong { font-weight: 700; }
.note-prose em { font-style: italic; }
.note-prose u { text-decoration: underline; }
.note-prose a { color: #2563eb; text-decoration: underline; }
.note-prose img { max-width: 100%; height: auto; border-radius: 4px; margin: 0.25em 0; }
.note-prose:focus { outline: none; }
`

const FONTS = [
  { label: '預設字體', value: '' },
  { label: '黑體 (Sans)', value: 'sans-serif' },
  { label: '襯線 (Serif)', value: 'serif' },
  { label: '等寬 (Mono)', value: 'monospace' },
]

const NOTE_EXTENSIONS = [StarterKit, TextStyleKit, Image.configure({ inline: false })]

// TipTap accepts '' for an empty doc. The DB default is '{}', which is not a
// valid doc — coerce anything without a node `type` to empty.
function normalizeContent(content: unknown): Content {
  if (content && typeof content === 'object' && 'type' in (content as object)) return content as Content
  return ''
}

export interface NoteEditorHandle {
  getHTML: () => string
  getJSON: () => unknown
  isEmpty: () => boolean
  setContent: (content: unknown) => void
}

interface NoteEditorProps {
  initialContent: unknown
  onChange: (json: unknown) => void
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={active ? 'bg-accent text-accent-foreground' : ''}
    >
      {children}
    </Button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadDrugImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      toast.error('圖片上傳失敗', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
      <ToolbarButton label="粗體" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="斜體" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="底線" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="項目符號" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="編號清單" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <select
        aria-label="字體"
        title="字體"
        className="h-7 rounded border bg-background px-1.5 text-xs"
        value={(editor.getAttributes('textStyle').fontFamily as string) ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontFamily(v).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <label className="flex h-7 cursor-pointer items-center gap-1 rounded border px-1.5 text-xs" title="文字顏色">
        <span
          className="h-3.5 w-3.5 rounded-sm border"
          style={{ background: (editor.getAttributes('textStyle').color as string) || '#111827' }}
        />
        <input
          type="color"
          aria-label="文字顏色"
          className="h-0 w-0 opacity-0"
          value={(editor.getAttributes('textStyle').color as string) || '#111827'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      <ToolbarButton label="清除顏色" onClick={() => editor.chain().focus().unsetColor().run()}>
        <Eraser className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="插入圖片" onClick={() => !uploading && fileRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </ToolbarButton>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
    </div>
  )
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor(
  { initialContent, onChange },
  ref
) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: NOTE_EXTENSIONS,
    content: normalizeContent(initialContent),
    editorProps: { attributes: { class: 'note-prose min-h-[140px] px-3 py-2' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editor?.getHTML() ?? '',
      getJSON: () => editor?.getJSON() ?? null,
      isEmpty: () => editor?.isEmpty ?? true,
      setContent: (content: unknown) => {
        editor?.commands.setContent(normalizeContent(content))
        onChange(editor?.getJSON())
      },
    }),
    [editor, onChange]
  )

  return (
    <div className="rounded-md border">
      <style>{NOTE_PROSE_CSS}</style>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="max-h-[320px] overflow-y-auto" />
    </div>
  )
})
