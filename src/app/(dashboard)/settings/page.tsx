import { requirePagePermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import RoleAssignmentSelect from "./role-assignment-select"

export default async function SettingsPage() {
  const authorization = await requirePagePermission([
    "membership.read",
    "role.read",
  ])
  const canManageRoles =
    authorization.permissions.has("membership.manage") &&
    authorization.permissions.has("role.manage")

  const [memberships, roles] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId: authorization.organizationId },
      include: {
        user: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">Organization members</h1>
      <p className="mb-8 text-gray-600">
        OpsFlow business roles are separate from Clerk organization roles.
      </p>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full text-left">
          <thead className="border-b bg-gray-100">
            <tr>
              <th className="p-4">Member</th>
              <th className="p-4">Business role</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((membership) => {
              const currentRoleKey = membership.roles[0]?.role.key ?? "auditor"

              return (
                <tr className="border-b" key={membership.id}>
                  <td className="p-4">
                    <div className="font-semibold">
                      {membership.user.fullName ??
                        membership.user.email ??
                        membership.user.clerkUserId ??
                        "Unknown member"}
                    </div>
                    {membership.user.email && (
                      <div className="text-sm text-gray-500">
                        {membership.user.email}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {canManageRoles ? (
                      <RoleAssignmentSelect
                        membershipId={membership.id}
                        currentRoleKey={currentRoleKey}
                        roles={roles.map((role) => ({
                          key: role.key,
                          name: role.name,
                        }))}
                      />
                    ) : (
                      membership.roles[0]?.role.name ?? "Auditor"
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
