import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle2, Lightbulb, Loader2 } from "lucide-react"
import type { Route } from "@/App"

interface Props {
  onNavigate: (r: Route) => void
}

export default function BotSuggestionPage({ onNavigate }: Props) {
  const [title, setTitle]           = useState("")
  const [description, setDescription] = useState("")
  const [usecase, setUsecase]       = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [submitted, setSubmitted]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.")
      return
    }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/v1/bot-feedback/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, usecase }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Suggestion received</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Thanks for the idea! We review all suggestions and use them to shape the roadmap.
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="sm" variant="outline" onClick={() => { setTitle(""); setDescription(""); setUsecase(""); setSubmitted(false) }}>
            Submit another
          </Button>
          <Button size="sm" onClick={() => onNavigate("home")}>Go home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Share a suggestion</h1>
            <p className="text-sm text-muted-foreground">Have an idea that would make Polymart better? We'd love to hear it.</p>
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give your suggestion a short, clear title"
                maxLength={100}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground/50 mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your idea in detail — what it does, how it would work, which part of Polymart it relates to..."
                maxLength={1000}
                rows={6}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground/50 mt-1">{description.length}/1000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Why would this help? <span className="text-muted-foreground/40 text-xs font-normal">(optional)</span>
              </label>
              <Textarea
                value={usecase}
                onChange={e => setUsecase(e.target.value)}
                placeholder="Who would benefit from this, and in what situations?"
                maxLength={300}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground/50">Suggestions are sent anonymously to our team via Discord.</p>
              <Button type="submit" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lightbulb className="w-4 h-4" />Send suggestion</>}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

    </div>
  )
}
