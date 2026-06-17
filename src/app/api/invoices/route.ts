import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.json()

  const {
    invoiceNumber,
    poNumber,
    vendorName,
    itemCode,
    quantity,
    unitPrice,
    invoiceDate
  } = body

  if (!invoiceNumber || !poNumber || quantity === undefined || unitPrice === undefined) {
    return Response.json(
      {
        error: "invoiceNumber, poNumber, quantity, and unitPrice are required"
      },
      {
        status: 400
      }
    )
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      poNumber,
      vendorName,
      itemCode,
      quantity,
      unitPrice,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null
    }
  })

  const order = await prisma.order.findFirst({
    where: {
      poNumber
    }
  })

  if (!order) {
    await prisma.exception.create({
      data: {
        title: "Missing purchase order",
        description: `No purchase order found for invoice ${invoiceNumber}`,
        type: "MISSING_DOCUMENT",
        poNumber
      }
    })
  } else {
    if (order.quantity !== quantity) {
      await prisma.exception.create({
        data: {
          title: "Invoice quantity mismatch",
          description: `PO ${poNumber} expected quantity ${order.quantity}, but invoice ${invoiceNumber} has quantity ${quantity}`,
          type: "QUANTITY_MISMATCH",
          poNumber
        }
      })
    }

    if (order.unitPrice !== unitPrice) {
      await prisma.exception.create({
        data: {
          title: "Invoice price mismatch",
          description: `PO ${poNumber} expected unit price ${order.unitPrice}, but invoice ${invoiceNumber} has unit price ${unitPrice}`,
          type: "PRICE_MISMATCH",
          poNumber
        }
      })
    }
  }

  return Response.json({
    message: "Invoice created and checked",
    invoice
  })
}

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })

  return Response.json({
    invoices
  })
}