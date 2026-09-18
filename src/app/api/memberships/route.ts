import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"

export async function GET() {
  const authorization = await authorizeApiRequest([
    "membership.read",
    "role.read",
  ])
  if (authorization.response) return authorization.response

  const [memberships, roles] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: {
        organizationId: authorization.context.organizationId,
      },
      include: {
        user: true,
        roles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  return Response.json({ memberships, roles })
}
