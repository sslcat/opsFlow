import type { InsightsResult } from "../../../lib/insights/types"
import { Badge, Icon } from "@/components/ui"

export function InvoiceInsightsPanel({ result }: { result: InsightsResult }) {
  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm"
      aria-labelledby="insights-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-600 p-2.5 text-white">
            <Icon name="sparkles" />
          </span>
          <div>
            <h2 id="insights-heading" className="text-lg font-semibold">
              AI insights
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Understand the result. Know what to review next.
            </p>
          </div>
        </div>
        <Badge tone="ai">Advisory only</Badge>
      </div>
      {result.status !== "AVAILABLE" ? (
        <p className="p-6 text-sm leading-7 text-slate-600" role="status">
          {result.status === "NOT_GENERATED"
            ? "AI insights were not generated for this previously processed invoice."
            : "AI insights are unavailable. Your invoice was processed successfully; review the invoice and any exceptions."}
        </p>
      ) : (
        <div className="p-6 sm:p-7">
          <p className="text-xs font-semibold tracking-widest text-indigo-600">
            AI SUMMARY
          </p>
          <p className="mt-3 max-w-4xl whitespace-pre-wrap break-words text-lg leading-8 text-slate-800">
            {result.insights.summary}
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {result.insights.observations.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-5">
                <h3 className="text-sm font-semibold">What we found</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  {result.insights.observations.map((text, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span className="whitespace-pre-wrap break-words">
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.insights.recommendations.length > 0 && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
                <h3 className="text-sm font-semibold text-indigo-900">
                  Suggested next actions
                </h3>
                <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  {result.insights.recommendations.map((text, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-indigo-600">
                        {index + 1}
                      </span>
                      <span className="whitespace-pre-wrap break-words">
                        {text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <Badge tone="ai">
              {Math.round(result.insights.confidence * 100)}% explanation
              confidence
            </Badge>
            <p className="text-xs text-slate-500">
              AI self-assessment, not a guarantee.
            </p>
          </div>
        </div>
      )}
      <p className="border-t border-slate-100 px-6 py-4 text-xs leading-5 text-slate-500">
        AI does not approve payment or resolve exceptions. Insights are
        available for this session and are not saved after leaving this page.
      </p>
    </section>
  )
}
