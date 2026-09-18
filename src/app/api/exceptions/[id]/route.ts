import { authorizeApiRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeApiRequest("exception.resolve")
  if (authorization.response) return authorization.response

  try {
    const { id } = await context.params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return Response.json(
        {
          error: "status is required",
        },
        {
          status: 400,
        }
      )
    }

    const existingException = await prisma.exception.findFirst({
      where: {
        id,
        organizationId: authorization.context.organizationId,
      },
    })

    if (!existingException) {
      return Response.json(
        { error: "Exception not found" },
        { status: 404 },
      )
    }

    const exception = await prisma.exception.update({
      where: {
        id_organizationId: {
          id: existingException.id,
          organizationId: authorization.context.organizationId,
        },
      },
      data: {
        status,
      },
    })

    return Response.json({
      message: "Exception updated",
      exception,
    })
  } catch (error) {
    console.error("Exception update failed:", error)

    return Response.json(
      {
        error: "Exception update failed",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    )
  }
}
