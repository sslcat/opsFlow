import { requireApiAuthentication } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authenticationError = await requireApiAuthentication()
  if (authenticationError) return authenticationError

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

    const exception = await prisma.exception.update({
      where: {
        id,
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
