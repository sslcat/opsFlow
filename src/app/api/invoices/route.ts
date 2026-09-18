import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import { createInvoiceWithMatching } from "../../../lib/invoice-processing.ts"
import { prisma } from "../../../lib/prisma.ts"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest([
    "invoice.create",
    "invoice.process",
    "exception.triage",
  ])
  if (authorization.response) return authorization.response
  const { organizationId } = authorization.context

  try {
    const body = await request.json()
    const {
      invoiceNumber,
      poNumber,
      vendorName,
      itemCode,
      quantity,
      unitPrice,
      invoiceDate,
    } = body

    if (
      typeof invoiceNumber !== "string" ||
      !invoiceNumber.trim() ||
      typeof poNumber !== "string" ||
      !poNumber.trim() ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      typeof unitPrice !== "number" ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      return apiError(
        400,
        "BAD_REQUEST",
        "invoiceNumber, poNumber, a positive integer quantity, and a non-negative unitPrice are required",
      )
    }

    const parsedInvoiceDate = invoiceDate ? new Date(invoiceDate) : null
    if (parsedInvoiceDate && Number.isNaN(parsedInvoiceDate.getTime())) {
      return apiError(400, "BAD_REQUEST", "invoiceDate must be a valid date")
    }

    const invoice = await prisma.$transaction((transaction) =>
      createInvoiceWithMatching(transaction, {
        organizationId,
        invoiceNumber: invoiceNumber.trim(),
        poNumber: poNumber.trim(),
        vendorName,
        itemCode,
        quantity,
        unitPrice,
        invoiceDate: parsedInvoiceDate,
      }),
    )

    return Response.json({
      message: "Invoice created and checked",
      invoice,
    })
  } catch (error) {
    logServerError("Invoice creation", error)
    return apiError(500, "INTERNAL_ERROR", "Invoice creation failed")
  }
}

export async function GET() {
  const authorization = await authorizeApiRequest("invoice.read")
  if (authorization.response) return authorization.response

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: authorization.context.organizationId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ invoices })
}
