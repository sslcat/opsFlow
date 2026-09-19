import type { InsightsResult } from "../../../lib/insights/types"

export function InvoiceInsightsPanel({ result }: { result: InsightsResult }) {
  if (result.status !== "AVAILABLE") {
    return <p className="mt-6 text-gray-600" role="status">
      {result.status === "NOT_GENERATED"
        ? "AI insights were not generated for this previously processed invoice."
        : "AI insights are unavailable. Your invoice was processed successfully; review the invoice and any exceptions."}
    </p>
  }

  const { insights } = result
  return (
    <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6" aria-labelledby="insights-heading">
      <h2 id="insights-heading" className="text-xl font-semibold">AI insights</h2>
      <p className="mt-2 text-sm text-gray-600">Advisory explanation only. This does not approve payment or resolve exceptions.</p>
      <p className="mt-4 whitespace-pre-wrap text-gray-900">{insights.summary}</p>
      {insights.observations.length > 0 && <>
        <h3 className="mt-4 font-semibold">Observations</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {insights.observations.map((text, index) => <li key={index}>{text}</li>)}
        </ul>
      </>}
      {insights.recommendations.length > 0 && <>
        <h3 className="mt-4 font-semibold">Suggested next actions</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {insights.recommendations.map((text, index) => <li key={index}>{text}</li>)}
        </ul>
      </>}
      <p className="mt-4 text-sm text-gray-600">
        Explanation confidence: {Math.round(insights.confidence * 100)}% (AI self-assessment, not a guarantee).
      </p>
    </section>
  )
}
