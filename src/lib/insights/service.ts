import "server-only"
import { createOpenAIInsightsProvider } from "./openai-provider.ts"
import { isInvoiceInsights } from "./validation.ts"
import type { InsightsInput, InsightsProvider, InsightsResult } from "./types.ts"

export async function generateInvoiceInsights(
  input: InsightsInput,
  provider: InsightsProvider | null = configuredProvider(),
): Promise<InsightsResult> {
  if (!provider) return { status: "UNAVAILABLE", insights: null }
  try {
    // Providers cannot mutate the processing snapshot through a shared reference.
    const output = await provider.generate(structuredClone(input))
    if (!isInvoiceInsights(output)) return { status: "UNAVAILABLE", insights: null }
    return { status: "AVAILABLE", provider: provider.name, model: provider.model, insights: output }
  } catch {
    // Advisory failure must never turn a committed invoice into a processing error.
    return { status: "UNAVAILABLE", insights: null }
  }
}

function configuredProvider(): InsightsProvider | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  return apiKey ? createOpenAIInsightsProvider({
    apiKey, model: process.env.OPENAI_INSIGHTS_MODEL?.trim() || "gpt-4o-mini",
  }) : null
}
