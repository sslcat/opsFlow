import type { NormalizedInvoice } from "../extraction/types.ts"

export type InsightsInput = {
  invoice: NormalizedInvoice
  purchaseOrder: { poNumber: string; quantity: number; unitPrice: number } | null
  matching: {
    status: "MATCHED" | "EXCEPTIONS"
    checks: readonly string[]
    exceptions: Array<{ type: string; description: string | null }>
  }
  validation: { status: "PASSED"; errors: string[]; warnings: string[] }
}

export type InvoiceInsights = {
  summary: string
  observations: string[]
  recommendations: string[]
  confidence: number
}

export interface InsightsProvider {
  readonly name: string
  readonly model: string
  generate(input: InsightsInput): Promise<unknown>
}

export type InsightsResult =
  | { status: "AVAILABLE"; provider: string; model: string; insights: InvoiceInsights }
  | { status: "UNAVAILABLE" | "NOT_GENERATED"; insights: null }
