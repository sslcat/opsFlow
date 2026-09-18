import { authorizeApiRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("order.create")
  if (authorization.response) return authorization.response

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
      organizationId: authorization.context.organizationId,
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
  const authorization = await authorizeApiRequest("order.read")
  if (authorization.response) return authorization.response

  const orders = await prisma.order.findMany({
    where: {
      organizationId: authorization.context.organizationId,
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return Response.json({
    orders
  })
}
