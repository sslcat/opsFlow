import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"

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
  if (!title || !type) {
    return Response.json(
      {
        error: "title and type required"
      },
      {
        status: 400
      }
    )
  }

  // Create exception
  const exception =
    await prisma.exception.create({
      data: {
        organizationId: authorization.context.organizationId,
        title,
        description,
        type
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
