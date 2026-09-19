import type { ExtractionProvider, NormalizedInvoice } from "./types.ts"

export const regexProvider: ExtractionProvider = {
  name: "regex", model: null,
  async extract({ text }): Promise<NormalizedInvoice> {
    const matches = [...text.matchAll(/(ITEM-[A-Z0-9-]+)\s+(.+?)\s+(\d+)\s+\$([\d,]+(?:\.\d+)?)\s+\$([\d,]+(?:\.\d+)?)/gi)]
    const itemCodes = [...text.matchAll(/\bITEM-[A-Z0-9-]+\b/gi)]
    if (itemCodes.length !== matches.length) {
      throw new Error("Not every invoice line could be parsed")
    }
    const amount = (value?: string) => Number(value?.replaceAll(",", ""))
    const lineItems: NormalizedInvoice["lineItems"] = matches.map(match => ({
      itemCode: match[1], description: match[2].trim(), quantity: Number(match[3]),
      unitPrice: amount(match[4]), total: amount(match[5]),
    }))
    if (!lineItems.length) {
      lineItems.push({
        itemCode: null, description: null,
        quantity: Number(text.match(/Quantity:\s*(\d+)/i)?.[1]),
        unitPrice: amount(text.match(/Unit Price:\s*\$?([\d,]+(?:\.\d+)?)/i)?.[1]),
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
