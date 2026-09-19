import type { NormalizedInvoice } from "./types.ts"

const nullableString = { type: ["string", "null"] }
const nullableNumber = { type: ["number", "null"] }
const itemProperties = {
  itemCode: nullableString, description: nullableString,
  quantity: { type: "number" }, unitPrice: { type: "number" }, total: nullableNumber,
}
const properties = {
  invoiceNumber: { type: "string" }, purchaseOrderNumber: { type: "string" },
  vendorName: { type: "string" }, invoiceDate: nullableString, currency: nullableString,
  lineItems: { type: "array", items: {
    type: "object", additionalProperties: false,
    properties: itemProperties, required: Object.keys(itemProperties),
  } },
  subtotal: nullableNumber, tax: nullableNumber, total: nullableNumber,
  confidence: { type: "number" }, warnings: { type: "array", items: { type: "string" } },
}

export const invoiceSchema = {
  type: "object", additionalProperties: false, properties, required: Object.keys(properties),
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 1000
}

// Runtime validation is independent of the provider's structured-output promise.
export function isNormalizedInvoice(value: unknown): value is NormalizedInvoice {
  if (!record(value)) return false
  if (Object.keys(value).length !== Object.keys(properties).length ||
    Object.keys(value).some(key => !(key in properties))) return false
  if (![value.invoiceNumber, value.purchaseOrderNumber, value.vendorName].every(text)) return false
  if (!(value.invoiceDate === null || (typeof value.invoiceDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.invoiceDate) &&
    Number.isFinite(Date.parse(value.invoiceDate)) &&
    new Date(value.invoiceDate).toISOString().slice(0, 10) === value.invoiceDate))) return false
  if (!(value.currency === null || (typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency)))) return false
  if (!finite(value.confidence) || value.confidence < 0 || value.confidence > 1) return false
  if (!Array.isArray(value.warnings) || value.warnings.length > 100 || !value.warnings.every(text)) return false
  if (![value.subtotal, value.tax, value.total].every(v => v === null || finite(v))) return false
  return Array.isArray(value.lineItems) && value.lineItems.length > 0 && value.lineItems.length <= 1000 &&
    value.lineItems.every(item => record(item) &&
      Object.keys(item).length === Object.keys(itemProperties).length &&
      Object.keys(item).every(key => key in itemProperties) &&
      (item.itemCode === null || text(item.itemCode)) &&
      (item.description === null || text(item.description)) &&
      finite(item.quantity) && finite(item.unitPrice) && (item.total === null || finite(item.total)))
}

export function validateInvoiceBusinessRules(invoice: NormalizedInvoice): string[] {
  const errors: string[] = []
  // The current matching/storage model cannot represent multiple lines safely.
  if (invoice.lineItems.length !== 1) errors.push("Multiple invoice lines are not supported by the current matching workflow")
  for (const item of invoice.lineItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 2147483647) errors.push("Quantity must be a positive 32-bit integer")
    if (item.unitPrice < 0 || !Number.isSafeInteger(Math.round(item.unitPrice * 100))) errors.push("Unit price must be a nonnegative supported amount")
    if (item.total !== null && Math.abs(item.total - item.quantity * item.unitPrice) > 0.011) errors.push("Line total does not match quantity and unit price")
  }
  for (const amount of [invoice.subtotal, invoice.tax, invoice.total]) {
    if (amount !== null && (amount < 0 || !Number.isSafeInteger(Math.round(amount * 100)))) errors.push("Totals must be nonnegative supported amounts")
  }
  const sum = invoice.lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  if (!Number.isFinite(sum) || !Number.isSafeInteger(Math.round(sum * 100))) errors.push("Invoice amount exceeds supported range")
  if (invoice.subtotal !== null && Math.abs(invoice.subtotal - sum) > 0.011) errors.push("Subtotal does not match invoice lines")
  if (invoice.total !== null && invoice.tax !== null && Math.abs(invoice.total - (invoice.subtotal ?? sum) - invoice.tax) > 0.011) errors.push("Invoice total does not match subtotal and tax")
  return errors
}
