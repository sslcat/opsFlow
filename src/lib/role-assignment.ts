import "server-only"

import type { SystemRoleKey } from "./authorization-policy.ts"
import { runSerializableTransaction } from "./serializable-transaction.ts"

const ADMINISTRATOR_ROLE: SystemRoleKey = "organization_administrator"

export class MembershipNotFoundError extends Error {}
export class LastAdministratorError extends Error {}

type AssignMembershipRoleInput = {
  organizationId: string
  membershipId: string
  roleKey: SystemRoleKey
  actorIdentifier: string
}

export async function assignMembershipRole({
  organizationId,
  membershipId,
  roleKey,
  actorIdentifier,
}: AssignMembershipRoleInput) {
  return runSerializableTransaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!membership) {
      throw new MembershipNotFoundError("Membership not found")
    }

    const role = await transaction.role.findUnique({
      where: { key: roleKey },
    })

    if (!role) {
      throw new Error(`Required system role is missing: ${roleKey}`)
    }

    const previousRoleKeys = membership.roles.map(({ role: currentRole }) =>
      currentRole.key
    )
    const removesAdministrator =
      previousRoleKeys.includes(ADMINISTRATOR_ROLE) &&
      roleKey !== ADMINISTRATOR_ROLE

    if (removesAdministrator) {
      const administratorCount = await transaction.membershipRole.count({
        where: {
          role: { key: ADMINISTRATOR_ROLE },
          membership: { organizationId },
        },
      })

      if (administratorCount <= 1) {
        throw new LastAdministratorError(
          "The organization's last administrator cannot be reassigned",
        )
      }
    }

    await transaction.membershipRole.deleteMany({
      where: { membershipId },
    })
    await transaction.membershipRole.create({
      data: {
        membershipId,
        roleId: role.id,
      },
    })
    await transaction.authorizationAuditEvent.create({
      data: {
        organizationId,
        action: "BUSINESS_ROLE_ASSIGNED",
        actorIdentifier,
        targetMembershipId: membershipId,
        metadata: {
          previousRoleKeys,
          assignedRoleKey: roleKey,
        },
      },
    })

    return transaction.organizationMembership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        user: true,
        roles: {
          include: { role: true },
        },
      },
    })
  })
}
