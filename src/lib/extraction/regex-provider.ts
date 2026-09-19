import type { ExtractionProvider, NormalizedInvoice } from "./types.ts"

function parseNumber(token?: string): number {
  if (!token || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(token)) {
    throw new Error("Unsupported numeric field")
  }
  return Number(token.replaceAll(",", ""))
}

export const regexProvider: ExtractionProvider = {
  name: "regex", model: null,
  async extract({ text }): Promise<NormalizedInvoice> {
    const matches = [...text.matchAll(/(ITEM-[A-Z0-9-]+)\s+(.+?)\s+(\S+)\s+\$(\S+)\s+\$(\S+)/gi)]
    const itemCodes = [...text.matchAll(/\bITEM-[A-Z0-9-]+\b/gi)]
    if (itemCodes.length !== matches.length) {
      throw new Error("Not every invoice line could be parsed")
    }
    const quantities = [...text.matchAll(/\bQuantity:/gi)]
    const prices = [...text.matchAll(/\bUnit Price:/gi)]
    // Never choose the first of repeated fields or combine two layout types.
    if (quantities.length > 1 || prices.length > 1 ||
      (matches.length > 0 && (quantities.length > 0 || prices.length > 0))) {
      throw new Error("Ambiguous or multiple invoice lines")
    }
    const lineItems: NormalizedInvoice["lineItems"] = matches.map(match => ({
      itemCode: match[1], description: match[2].trim(), quantity: parseNumber(match[3]),
      unitPrice: parseNumber(match[4]), total: parseNumber(match[5]),
    }))
    if (!lineItems.length) {
      if (quantities.length !== 1 || prices.length !== 1) {
        throw new Error("Expected one quantity and unit price")
      }
      lineItems.push({
        itemCode: null, description: null,
        quantity: parseNumber(text.match(/\bQuantity:\s*(\S+)/i)?.[1]),
        unitPrice: parseNumber(text.match(/\bUnit Price:\s*\$?(\S+)/i)?.[1]),
        total: null,
      })
    }
    return {
      invoiceNumber: text.match(/Invoice Number:\s*([A-Z0-9-]+)/i)?.[1] ?? "",
      purchaseOrderNumber: text.match(/Purchase Order:\s*([A-Z0-9-]+)/i)?.[1] ?? "",
      vendorName: text.match(/Vendor:\s*(.*?)(?=\s+(?:Bill To:|Quantity:))/i)?.[1]?.trim() ?? "",
      invoiceDate: null, currency: null, lineItems, subtotal: null, tax: null, total: null,
      confidence: 0.5,
      warnings: ["Deterministic fallback supports known layouts only; date, currency and invoice totals were not extracted"],
    }
  },
}
