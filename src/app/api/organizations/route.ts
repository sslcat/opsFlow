import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError } from "../../../lib/api-response.ts"
import { prisma } from "../../../lib/prisma.ts"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("organization.manage")
  if (authorization.response) return authorization.response

  // Read incoming JSON body
  const body = await request.json()

  // Get organization name from body
  const { name } = body

  // Basic validation
  if (typeof name !== "string" || !name.trim()) {
    return apiError(400, "BAD_REQUEST", "Organization name is required")
  }

  const organization = await prisma.organization.update({
    where: {
      id: authorization.context.organizationId,
    },
    data: {
      name: name.trim(),
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
