import { Card, DataTable, EmptyState, PageHeader } from "@/components/ui"
import { getWorkspacePageContext } from "@/components/workspace-page-access"
import { WorkspaceAccessState } from "@/components/workspace-access-state"
import { prisma } from "@/lib/prisma"
import RoleAssignmentSelect from "./role-assignment-select"

export default async function SettingsPage() {
  const authorization = await getWorkspacePageContext([
    "membership.read",
    "role.read",
  ])
  if (!authorization) return <WorkspaceAccessState />

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
      <PageHeader
        title="Organization members"
        description="Manage your team's business roles and access. OpsFlow roles are separate from Clerk organization roles."
      />

      {memberships.length === 0 ? (
        <Card>
          <EmptyState
            icon="settings"
            title="No members to display"
            description="Members of your active organization will appear here. Contact your administrator if you expected to see your team."
          />
        </Card>
      ) : (
        <DataTable label="Organization members">
          <thead className="border-b bg-gray-100">
            <tr>
              <th scope="col" className="p-4">
                Member
              </th>
              <th scope="col" className="p-4">
                Business role
              </th>
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
                      (membership.roles[0]?.role.name ?? "Auditor")
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
