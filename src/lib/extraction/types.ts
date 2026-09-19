export type NormalizedInvoice = {
  invoiceNumber: string
  purchaseOrderNumber: string
  vendorName: string
  invoiceDate: string | null
  currency: string | null
  lineItems: Array<{
    itemCode: string | null
    description: string | null
    quantity: number
    unitPrice: number
    total: number | null
  }>
  subtotal: number | null
  tax: number | null
  total: number | null
  confidence: number
  warnings: string[]
}

export type ExtractionInput = {
  document: Buffer | null
  text: string
  metadata: { documentId: string | null; fileName: string | null }
}

export interface ExtractionProvider {
  readonly name: string
  readonly model: string | null
  extract(input: ExtractionInput): Promise<unknown>
}

export type ExtractionAttempt = {
  provider: string
  model: string | null
  timestamp: string
  confidence: number | null
  status: "SUCCEEDED" | "FAILED"
  warnings: string[]
}

export type ExtractionResult = {
  documentId: string | null
  invoice: NormalizedInvoice | null
  attempts: ExtractionAttempt[]
  errors: string[]
}
