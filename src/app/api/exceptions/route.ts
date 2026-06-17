import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {

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

  const exceptions =
    await prisma.exception.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })

  return Response.json({
    exceptions
  })
}