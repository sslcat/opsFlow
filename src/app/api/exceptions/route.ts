import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError } from "../../../lib/api-response.ts"
import { prisma } from "../../../lib/prisma.ts"
import { ExceptionType } from "@prisma/client"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("exception.triage")
  if (authorization.response) return authorization.response

  // Read JSON body
  const body = await request.json()

  const {
    title,
    description,
    type
  } = body

  // Validation
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof type !== "string" ||
    !Object.values(ExceptionType).includes(type as ExceptionType)
  ) {
    return apiError(400, "BAD_REQUEST", "title and a valid type are required")
  }

  // Create exception
  const exception =
    await prisma.exception.create({
      data: {
        organizationId: authorization.context.organizationId,
        title: title.trim(),
        description,
        type: type as ExceptionType,
      }
    })

  return Response.json({
    message: "Exception created",
    exception
  })
}

export async function GET() {
  const authorization = await authorizeApiRequest("exception.read")
  if (authorization.response) return authorization.response

  const exceptions =
    await prisma.exception.findMany({
      where: {
        organizationId: authorization.context.organizationId,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

  return Response.json({
    exceptions
  })
}
