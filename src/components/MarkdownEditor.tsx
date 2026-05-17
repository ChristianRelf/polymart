import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownBody } from "@/components/MarkdownBody"
import { Bold, Italic, Code, Link, ImageIcon, Loader2 } from "lucide-react"

interface Props {
  value: string
  onChange: (v: string) => void
  maxLength?: number
  rows?: number
  placeholder?: string
  onUploadImage?: (file: File) => Promise<string>
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  maxLength = 10000,
  rows = 4,
  placeholder,
  onUploadImage,
  className = "",
}: Props) {
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)

  function wrap(prefix: string, suffix = "", fallback = "text") {
    const el = textareaRef.current
    if (!el) { onChange(value + prefix + fallback + suffix); return }
    const s        = el.selectionStart
    const e        = el.selectionEnd
    const selected = value.slice(s, e) || fallback
    const next     = value.slice(0, s) + prefix + selected + suffix + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + prefix.length, s + prefix.length + selected.length)
    })
  }

  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file || !onUploadImage) return
    ev.target.value = ""
    setUploading(true)
    try {
      const url      = await onUploadImage(file)
      const el       = textareaRef.current
      const pos      = el?.selectionStart ?? value.length
      const snippet  = `![${file.name}](${url})`
      onChange(value.slice(0, pos) + snippet + value.slice(pos))
    } catch {
      // silent — user can retry
    } finally {
      setUploading(false)
    }
  }

  const toolBtn = "p-1 rounded hover:bg-muted transition-colors cursor-pointer bg-transparent border-0 text-muted-foreground hover:text-foreground disabled:opacity-40"

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-1.5">
        {(["Write", "Preview"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setPreview(tab === "Preview")}
            className={`text-xs font-medium transition-colors cursor-pointer bg-transparent border-0 px-0 pb-0.5 border-b-2 ${
              (tab === "Preview") === preview
                ? "border-b-foreground text-foreground"
                : "border-b-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}

        {!preview && (
          <div className="flex items-center gap-0.5 ml-auto">
            <button type="button" title="Bold (wrap **)" onClick={() => wrap("**", "**", "bold")} className={toolBtn}>
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Italic (wrap *)" onClick={() => wrap("*", "*", "italic")} className={toolBtn}>
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Inline code" onClick={() => wrap("`", "`", "code")} className={toolBtn}>
              <Code className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Link" onClick={() => wrap("[", "](url)", "link text")} className={toolBtn}>
              <Link className="w-3.5 h-3.5" />
            </button>
            {onUploadImage && (
              <>
                <button
                  type="button"
                  title="Upload image (jpeg/png/gif/webp ≤ 3 MB)"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className={toolBtn}
                >
                  {uploading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ImageIcon className="w-3.5 h-3.5" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        )}
      </div>

      {preview ? (
        <div
          className="min-h-[6rem] px-3 py-2 rounded-md border border-input bg-transparent"
          style={{ minHeight: `${rows * 1.6}rem` }}
        >
          {value.trim()
            ? <MarkdownBody content={value} />
            : <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className="resize-none font-mono text-sm"
        />
      )}
    </div>
  )
}
