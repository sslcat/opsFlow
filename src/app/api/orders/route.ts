import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.json()

  const {
    poNumber,
    vendorName,
    itemCode,
    quantity,
    unitPrice,
    expectedDate
  } = body

  if (!poNumber || quantity === undefined || unitPrice === undefined) {
    return Response.json(
      {
        error: "poNumber, quantity, and unitPrice are required"
      },
      {
        status: 400
      }
    )
  }

  const order = await prisma.order.create({
    data: {
      poNumber,
      vendorName,
      itemCode,
      quantity,
      unitPrice,
      expectedDate: expectedDate ? new Date(expectedDate) : null
    }
  })

  return Response.json({
    message: "Order created",
    order
  })
}

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })

  return Response.json({
    orders
  })
}