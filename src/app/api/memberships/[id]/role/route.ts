import { isSystemRoleKey } from "../../../../../lib/authorization-policy.ts"
import { authorizeApiRequest } from "../../../../../lib/auth.ts"
import {
  assignMembershipRole,
  LastAdministratorError,
  MembershipNotFoundError,
} from "../../../../../lib/role-assignment.ts"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeApiRequest([
    "membership.manage",
    "role.manage",
  ])
  if (authorization.response) return authorization.response

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "A JSON body is required" }, { status: 400 })
  }

  const roleKey =
    typeof body === "object" && body !== null && "roleKey" in body
      ? (body as { roleKey?: unknown }).roleKey
      : undefined

  if (typeof roleKey !== "string" || !isSystemRoleKey(roleKey)) {
    return Response.json({ error: "A valid roleKey is required" }, { status: 400 })
  }

  const { id } = await context.params

  try {
    const membership = await assignMembershipRole({
      organizationId: authorization.context.organizationId,
      membershipId: id,
      roleKey,
      actorIdentifier: authorization.context.clerkUserId,
    })

    return Response.json({
      message: "Business role assigned",
      membership,
    })
  } catch (error) {
    if (error instanceof MembershipNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 })
    }

    if (error instanceof LastAdministratorError) {
      return Response.json({ error: error.message }, { status: 409 })
    }

    console.error("Business role assignment failed:", error)
    return Response.json(
      { error: "Business role assignment failed" },
      { status: 500 },
    )
  }
}
