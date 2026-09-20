import { Badge, Icon, type IconName } from "@/components/ui"
import type { InsightsResult } from "@/lib/insights/types"

export type UploadPhase =
  "idle" | "uploading" | "processing" | "complete" | "error"

export function UploadProgress({
  phase,
  progress,
  uploaded,
  insights,
  extractionProvider,
  alreadyProcessed,
}: {
  phase: UploadPhase
  progress: number | null
  uploaded: boolean
  insights: InsightsResult | null
  extractionProvider?: string
  alreadyProcessed?: boolean
}) {
  const steps: {
    title: string
    detail: string
    icon: IconName
    state: string
  }[] = [
    {
      title: "Secure upload",
      detail: uploaded
        ? "Document received"
        : phase === "uploading"
          ? progress === 100
            ? "Transfer finished. Saving document…"
            : "Transferring your PDF…"
          : "Send your invoice PDF",
      icon: "upload",
      state: uploaded
        ? "Complete"
        : phase === "uploading"
          ? "In progress"
          : "Waiting",
    },
    {
      title:
        extractionProvider === "regex"
          ? "Fallback extraction"
          : "AI extraction",
      detail: alreadyProcessed
        ? "Previously processed; extraction was not repeated"
        : "Read and validate invoice details",
      icon: "sparkles",
      state: phase === "complete" ? "Complete" : "Waiting for result",
    },
    {
      title: "Purchase order matching",
      detail: alreadyProcessed
        ? "Existing processing result retrieved"
        : "Check quantities and unit prices",
      icon: "orders",
      state: phase === "complete" ? "Complete" : "Waiting for result",
    },
    {
      title: "AI Insights generation",
      detail: "Explain results and suggest next actions",
      icon: "sparkles",
      state:
        phase === "complete"
          ? insights?.status === "AVAILABLE"
            ? "Complete"
            : insights?.status === "NOT_GENERATED"
              ? "Not generated"
              : "Unavailable"
          : "Waiting for result",
    },
  ]
  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="progress-heading" className="font-semibold">
          From invoice to clarity
        </h2>
        <Badge tone="ai">AI workflow</Badge>
      </div>
      <ol className="mt-6 space-y-6">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.state === "Complete" ? "bg-emerald-50 text-emerald-700" : phase === "processing" && index > 0 ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
            >
              <Icon
                name={step.state === "Complete" ? "check" : step.icon}
                className="h-4 w-4"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">
                {step.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {step.detail}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {phase === "error" && step.state !== "Complete"
                  ? "Not confirmed"
                  : phase === "idle" && index > 0
                    ? "Waiting"
                    : step.state}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {phase === "uploading" && (
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>File transfer</span>
            <span>{progress === null ? "Uploading…" : `${progress}%`}</span>
          </div>
          <progress
            aria-label="File transfer progress"
            max={100}
            value={progress ?? undefined}
            className="h-2 w-full accent-indigo-600"
          />
        </div>
      )}
      {phase === "processing" && (
        <div
          role="status"
          className="mt-6 rounded-xl bg-indigo-50 p-4 text-xs leading-6 text-indigo-800"
        >
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          Processing your invoice. Extraction, matching, and AI Insights run
          together; individual results appear when processing finishes.
        </div>
      )}
      <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
        AI helps interpret your invoice. Matching rules determine exceptions;
        your team stays in control.
      </p>
    </section>
  )
}
