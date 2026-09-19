import "server-only"

import type { Prisma } from "@prisma/client"

export type InvoiceInput = {
  organizationId: string
  invoiceNumber: string
  poNumber: string
  vendorName?: string | null
  itemCode?: string | null
  quantity: number
  unitPrice: number
  invoiceDate?: Date | null
  sourceDocumentId?: string | null
}

export async function createInvoiceWithMatching(
  transaction: Prisma.TransactionClient,
  input: InvoiceInput,
) {
  return (await createInvoiceWithMatchingResult(transaction, input)).invoice
}

export async function createInvoiceWithMatchingResult(
  transaction: Prisma.TransactionClient,
  input: InvoiceInput,
) {
  const invoice = await transaction.invoice.create({
    data: input,
  })

  const order = await transaction.order.findFirst({
    where: {
      organizationId: input.organizationId,
      poNumber: input.poNumber,
    },
  })

  const exceptions: Prisma.ExceptionCreateManyInput[] = []

  if (!order) {
    exceptions.push({
      organizationId: input.organizationId,
      title: "Missing purchase order",
      description: `No purchase order found for invoice ${input.invoiceNumber}`,
      type: "MISSING_DOCUMENT",
      poNumber: input.poNumber,
    })
  } else {
    if (order.quantity !== input.quantity) {
      exceptions.push({
        organizationId: input.organizationId,
        title: "Invoice quantity mismatch",
        description: `PO ${input.poNumber} expected quantity ${order.quantity}, but invoice ${input.invoiceNumber} has quantity ${input.quantity}`,
        type: "QUANTITY_MISMATCH",
        poNumber: input.poNumber,
      })
    }

    if (order.unitPrice !== input.unitPrice) {
      exceptions.push({
        organizationId: input.organizationId,
        title: "Invoice price mismatch",
        description: `PO ${input.poNumber} expected unit price ${order.unitPrice}, but invoice ${input.invoiceNumber} has unit price ${input.unitPrice}`,
        type: "PRICE_MISMATCH",
        poNumber: input.poNumber,
      })
    }
  }

  for (const exception of exceptions) {
    await transaction.exception.create({ data: exception })
  }

  return {
    invoice,
    purchaseOrder: order ? {
      poNumber: order.poNumber,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
    } : null,
    matching: {
      status: exceptions.length ? "EXCEPTIONS" as const : "MATCHED" as const,
      checks: order ? ["purchaseOrderExists", "quantity", "unitPrice"] : ["purchaseOrderExists"],
      exceptions: exceptions.map(({ type, description }) => ({ type, description: description ?? null })),
    },
  }
}
