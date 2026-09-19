import "server-only"
import { extractPdfText } from "../invoice-extraction.ts"
import { createOpenAIProvider } from "./openai-provider.ts"
import { regexProvider } from "./regex-provider.ts"
import type { ExtractionInput, ExtractionProvider, ExtractionResult, NormalizedInvoice } from "./types.ts"
import { isNormalizedInvoice, validateInvoiceBusinessRules } from "./validation.ts"

function defaultProviders(): ExtractionProvider[] {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  return [
    ...(apiKey ? [createOpenAIProvider({ apiKey, model: process.env.OPENAI_EXTRACTION_MODEL?.trim() || "gpt-4o-mini" })] : []),
    regexProvider,
  ]
}

export async function extractInvoice(
  input: ExtractionInput,
  providers = defaultProviders(),
): Promise<ExtractionResult> {
  const result: ExtractionResult = { documentId: input.metadata.documentId, invoice: null, attempts: [], errors: [] }
  if (!input.text.trim() || input.text.length > 100000) {
    result.errors = ["Document must contain readable text of at most 100,000 characters"]
    return result
  }
  for (const provider of providers) {
    const attempt: ExtractionResult["attempts"][number] = {
      provider: provider.name, model: provider.model, timestamp: new Date().toISOString(),
      confidence: null, status: "FAILED", warnings: [],
    }
    result.attempts.push(attempt)
    let value: unknown
    try { value = await provider.extract(input) } catch {
      attempt.warnings = ["Provider unavailable or returned an unusable response"]
      continue
    }
    if (!isNormalizedInvoice(value)) {
      attempt.warnings = ["Required fields or field types are invalid"]
      continue
    }
    attempt.confidence = value.confidence
    attempt.warnings = value.warnings
    result.invoice = value
    result.errors = validateInvoiceBusinessRules(value)
    // A weaker fallback must not bypass a detected business-rule failure.
    if (!result.errors.length) attempt.status = "SUCCEEDED"
    return result
  }
  result.errors = ["Could not extract all required invoice fields"]
  return result
}

export async function extractInvoiceDocument(input: {
  document: Buffer
  metadata: ExtractionInput["metadata"]
}): Promise<ExtractionResult> {
  let text: string
  try { text = await extractPdfText(input.document) } catch {
    return {
      documentId: input.metadata.documentId, invoice: null, errors: ["Could not read PDF text"],
      attempts: [{ provider: "pdf-text", model: null, timestamp: new Date().toISOString(), confidence: null, status: "FAILED", warnings: ["PDF text extraction failed"] }],
    }
  }
  return extractInvoice({ ...input, text })
}

// Compatibility adapter for existing API responses and the single-line matcher.
export function toParsedInvoice(invoice: NormalizedInvoice) {
  const item = invoice.lineItems[0]
  return {
    invoiceNumber: invoice.invoiceNumber, poNumber: invoice.purchaseOrderNumber,
    vendorName: invoice.vendorName, itemCode: item.itemCode ?? undefined,
    quantity: item.quantity, unitPrice: item.unitPrice,
  }
}
