import type { InvoiceInsights } from "./types.ts"

export const insightsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "observations", "recommendations", "confidence"],
  properties: {
    summary: { type: "string" },
    observations: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
}

export function isInvoiceInsights(value: unknown): value is InvoiceInsights {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  const text = (entry: unknown) => typeof entry === "string" && entry.trim().length > 0 && entry.length <= 2000
  const list = (entry: unknown) => Array.isArray(entry) && entry.length <= 10 && entry.every(text)
  return Object.keys(result).length === 4 &&
    text(result.summary) && list(result.observations) && list(result.recommendations) &&
    typeof result.confidence === "number" && Number.isFinite(result.confidence) &&
    result.confidence >= 0 && result.confidence <= 1
}
