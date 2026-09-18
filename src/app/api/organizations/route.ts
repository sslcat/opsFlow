import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("organization.manage")
  if (authorization.response) return authorization.response

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

  const organization = await prisma.organization.update({
    where: {
      id: authorization.context.organizationId,
    },
    data: {
      name
    }
  })

  return Response.json({
    message: "Organization updated successfully",
    organization
  })
}

export async function GET() {
  const authorization = await authorizeApiRequest("organization.read")
  if (authorization.response) return authorization.response

  const organization = await prisma.organization.findUniqueOrThrow({
      where: {
        id: authorization.context.organizationId,
      },
    })

  return Response.json({
    organizations: [organization]
  })
}
