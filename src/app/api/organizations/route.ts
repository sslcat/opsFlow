import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {

  // Read incoming JSON body
  const body = await request.json()

  // Get organization name from body
  const { name } = body

  // Basic validation
  if (!name) {
    return Response.json(
      {
        error: "Organization name is required"
      },
      {
        status: 400
      }
    )
  }

  // Create record in DB
  const organization = await prisma.organization.create({
    data: {
      name
    }
  })

  return Response.json({
    message: "Organization created successfully",
    organization
  })
}

export async function GET() {
  const organizations =
    await prisma.organization.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })

  return Response.json({
    organizations
  })
}