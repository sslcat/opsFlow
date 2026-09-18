import { isSystemRoleKey } from "../../../../../lib/authorization-policy.ts"
import { authorizeApiRequest } from "../../../../../lib/auth.ts"
import { apiError, logServerError } from "../../../../../lib/api-response.ts"
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
    return apiError(400, "BAD_REQUEST", "A JSON body is required")
  }

  const roleKey =
    typeof body === "object" && body !== null && "roleKey" in body
      ? (body as { roleKey?: unknown }).roleKey
      : undefined

  if (typeof roleKey !== "string" || !isSystemRoleKey(roleKey)) {
    return apiError(400, "BAD_REQUEST", "A valid roleKey is required")
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
      return apiError(404, "NOT_FOUND", error.message)
    }

    if (error instanceof LastAdministratorError) {
      return apiError(409, "CONFLICT", error.message)
    }

    logServerError("Business role assignment", error)
    return apiError(500, "INTERNAL_ERROR", "Business role assignment failed")
  }
}
