import { Prisma } from "@prisma/client"
import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import {
  extractPdfText,
  isCompleteParsedInvoice,
  parseInvoice,
} from "../../../lib/invoice-extraction.ts"
import { createInvoiceWithMatching } from "../../../lib/invoice-processing.ts"
import { prisma } from "../../../lib/prisma.ts"
import { runSerializableTransaction } from "../../../lib/serializable-transaction.ts"
import { readUpload } from "../../../lib/uploads.ts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest([
    "document.process",
    "invoice.create",
    "invoice.process",
    "exception.triage",
  ])
  if (authorization.response) return authorization.response
  const { organizationId } = authorization.context
  let sourceDocumentId: string | undefined

  try {
    const body: unknown = await request.json()
    const documentId =
      typeof body === "object" && body !== null && "documentId" in body
        ? (body as { documentId?: unknown }).documentId
        : undefined

    if (typeof documentId !== "string" || !documentId.trim()) {
      return apiError(400, "BAD_REQUEST", "documentId is required")
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, organizationId, type: "INVOICE" },
    })

    if (!document) {
      return apiError(404, "NOT_FOUND", "Document not found")
    }
    sourceDocumentId = document.id

    const existingInvoice = await prisma.invoice.findFirst({
      where: { organizationId, sourceDocumentId: document.id },
    })

    if (existingInvoice) {
      return Response.json({
        message: "Invoice already processed",
        parsed: invoiceToParsed(existingInvoice),
        invoice: existingInvoice,
        idempotent: true,
      })
    }

    if (document.status === "PARSED") {
      return apiError(
        409,
        "CONFLICT",
        "This legacy document was already processed",
      )
    }

    const fileBuffer = await readUpload(document.storageKey)
    const parsed = parseInvoice(await extractPdfText(fileBuffer))

    if (!isCompleteParsedInvoice(parsed)) {
      await prisma.document.update({
        where: { id_organizationId: { id: document.id, organizationId } },
        data: { status: "FAILED" },
      })

      return apiError(
        400,
        "BAD_REQUEST",
        "Could not extract all required invoice fields",
      )
    }

    const result = await runSerializableTransaction(async (transaction) => {
      const alreadyCreated = await transaction.invoice.findFirst({
        where: { organizationId, sourceDocumentId: document.id },
      })

      if (alreadyCreated) {
        return { invoice: alreadyCreated, created: false }
      }

      const invoice = await createInvoiceWithMatching(transaction, {
        organizationId,
        sourceDocumentId: document.id,
        invoiceNumber: parsed.invoiceNumber,
        poNumber: parsed.poNumber,
        vendorName: parsed.vendorName,
        itemCode: parsed.itemCode,
        quantity: parsed.quantity,
        unitPrice: parsed.unitPrice,
      })

      await transaction.document.update({
        where: { id_organizationId: { id: document.id, organizationId } },
        data: { status: "PARSED" },
      })

      return { invoice, created: true }
    })

    return Response.json({
      message: result.created ? "Invoice processed" : "Invoice already processed",
      parsed,
      invoice: result.invoice,
      idempotent: !result.created,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      sourceDocumentId
    ) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { organizationId, sourceDocumentId },
      })

      if (existingInvoice) {
        return Response.json({
          message: "Invoice already processed",
          parsed: invoiceToParsed(existingInvoice),
          invoice: existingInvoice,
          idempotent: true,
        })
      }
    }

    logServerError("Invoice processing", error)
    return apiError(500, "INTERNAL_ERROR", "Processing failed")
  }
}

function invoiceToParsed(invoice: {
  invoiceNumber: string
  poNumber: string
  vendorName: string | null
  itemCode: string | null
  quantity: number
  unitPrice: number
}) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    poNumber: invoice.poNumber,
    vendorName: invoice.vendorName ?? undefined,
    itemCode: invoice.itemCode ?? undefined,
    quantity: invoice.quantity,
    unitPrice: invoice.unitPrice,
  }
}
