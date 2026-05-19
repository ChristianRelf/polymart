import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Bug, CheckCircle2, Loader2 } from "lucide-react"
import type { Route } from "@/App"

interface Props {
  onNavigate: (r: Route) => void
}

export default function BotBugReportPage({ onNavigate }: Props) {
  const [summary, setSummary]       = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps]           = useState("")
  const [expected, setExpected]     = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [submitted, setSubmitted]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!summary.trim() || !description.trim()) {
      setError("Summary and description are required.")
      return
    }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/v1/bot-feedback/bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, description, steps, expected }),
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
        <h1 className="text-xl font-bold text-foreground mb-2">Report submitted</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Thanks for helping us improve Polymart. We'll look into this as soon as possible.
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="sm" variant="outline" onClick={() => { setSummary(""); setDescription(""); setSteps(""); setExpected(""); setSubmitted(false) }}>
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
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Report a bug</h1>
            <p className="text-sm text-muted-foreground">Help us track down and fix issues with Polymart</p>
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Summary <span className="text-red-400">*</span>
              </label>
              <Input
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="One-line description of the bug"
                maxLength={100}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground/50 mt-1">{summary.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                What's happening? <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the bug in detail — what you see, when it happens, which page or feature..."
                maxLength={1000}
                rows={5}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground/50 mt-1">{description.length}/1000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Steps to reproduce <span className="text-muted-foreground/40 text-xs font-normal">(optional)</span>
              </label>
              <Textarea
                value={steps}
                onChange={e => setSteps(e.target.value)}
                placeholder={"1. Go to...\n2. Click on...\n3. See error"}
                maxLength={500}
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Expected behaviour <span className="text-muted-foreground/40 text-xs font-normal">(optional)</span>
              </label>
              <Textarea
                value={expected}
                onChange={e => setExpected(e.target.value)}
                placeholder="What did you expect to happen instead?"
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
              <p className="text-[11px] text-muted-foreground/50">Reports are sent anonymously to our team via Discord.</p>
              <Button type="submit" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bug className="w-4 h-4" />Submit report</>}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

    </div>
  )
}
