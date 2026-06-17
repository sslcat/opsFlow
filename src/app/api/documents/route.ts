import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {

  // Read request body
  const body = await request.json()

  const {
    fileName,
    type
  } = body

  // Validation
  if (!fileName || !type) {
    return Response.json(
      {
        error: "fileName and type are required"
      },
      {
        status: 400
      }
    )
  }

  // Create document record
  const document =
    await prisma.document.create({
      data: {
        fileName,
        type
      }
    })

  return Response.json({
    message: "Document created",
    document
  })
}

export async function GET() {

  const documents =
    await prisma.document.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })

  return Response.json({
    documents
  })
}