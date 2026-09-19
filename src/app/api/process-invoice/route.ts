import { Prisma } from "@prisma/client"
import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import { extractInvoiceDocument, toParsedInvoice } from "../../../lib/extraction/engine.ts"
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
    const extraction = await extractInvoiceDocument({
      document: fileBuffer,
      metadata: { documentId: document.id, fileName: document.fileName },
    })
    const parsed = extraction.invoice ? toParsedInvoice(extraction.invoice) : null

    const result = await runSerializableTransaction(async (transaction) => {
      await transaction.extractionRun.create({
        data: { organizationId, documentId: document.id,
          result: JSON.parse(JSON.stringify(extraction)) as Prisma.InputJsonValue },
      })
      const alreadyCreated = await transaction.invoice.findFirst({
        where: { organizationId, sourceDocumentId: document.id },
      })

      if (alreadyCreated) {
        return { invoice: alreadyCreated, created: false }
      }

      if (!parsed || extraction.errors.length) {
        await transaction.document.update({
          where: { id_organizationId: { id: document.id, organizationId } },
          data: { status: "FAILED" },
        })
        return { invoice: null, created: false }
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
        invoiceDate: extraction.invoice?.invoiceDate ? new Date(extraction.invoice.invoiceDate) : null,
      })

      await transaction.document.update({
        where: { id_organizationId: { id: document.id, organizationId } },
        data: { status: "PARSED" },
      })

      return { invoice, created: true }
    })

    if (!result.invoice) {
      return apiError(400, "BAD_REQUEST", extraction.errors.join("; "))
    }

    return Response.json({
      message: result.created ? "Invoice processed" : "Invoice already processed",
      parsed: result.created ? parsed : invoiceToParsed(result.invoice),
      invoice: result.invoice,
      idempotent: !result.created,
      extraction,
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
