import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError } from "../../../lib/api-response.ts"
import { prisma } from "../../../lib/prisma.ts"

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

  if (
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
      "poNumber, a positive integer quantity, and a non-negative unitPrice are required",
    )
  }

  const parsedExpectedDate = expectedDate ? new Date(expectedDate) : null
  if (parsedExpectedDate && Number.isNaN(parsedExpectedDate.getTime())) {
    return apiError(400, "BAD_REQUEST", "expectedDate must be a valid date")
  }

  const order = await prisma.order.create({
    data: {
      organizationId: authorization.context.organizationId,
      poNumber: poNumber.trim(),
      vendorName,
      itemCode,
      quantity,
      unitPrice,
      expectedDate: parsedExpectedDate,
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
