import { Badge, Card, DataTable, EmptyState, PageHeader } from "@/components/ui"
import { getWorkspacePageContext } from "@/components/workspace-page-access"
import { WorkspaceAccessState } from "@/components/workspace-access-state"
import { getExceptionsPageData } from "@/lib/tenant-page-data"
import ResolveExceptionButton from "./resolve-exception-button"

export default async function ExceptionsPage() {
  const authorization = await getWorkspacePageContext("exception.read")

  if (!authorization) return <WorkspaceAccessState />

  const exceptions = await getExceptionsPageData(authorization.organizationId)

  return (
    <div>
      <PageHeader
        title="Exceptions"
        description="Focus on discrepancies. Review the details and take the next step."
      />

      {exceptions.length === 0 ? (
        <Card>
          <EmptyState
            title="No exceptions yet"
            description="Discrepancies detected during invoice processing will appear here."
          />
        </Card>
      ) : (
        <DataTable label="Exceptions">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th scope="col" className="p-4">
                Title
              </th>
              <th scope="col" className="p-4">
                Type
              </th>
              <th scope="col" className="p-4">
                Status
              </th>
              <th scope="col" className="p-4">
                Description
              </th>
              <th scope="col" className="p-4">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {exceptions.map((exception) => (
              <tr key={exception.id} className="border-b">
                <td className="p-4 font-semibold">{exception.title}</td>

                <td className="p-4">{exception.type.replaceAll("_", " ")}</td>

                <td className="p-4">
                  <Badge
                    tone={
                      exception.status === "OPEN"
                        ? "warning"
                        : exception.status === "RESOLVED"
                          ? "success"
                          : "ai"
                    }
                  >
                    {exception.status.replaceAll("_", " ")}
                  </Badge>
                </td>

                <td className="p-4">{exception.description}</td>

                <td className="p-4">
                  {exception.status === "OPEN" &&
                  authorization.permissions.has("exception.resolve") ? (
                    <ResolveExceptionButton id={exception.id} />
                  ) : (
                    <span className="text-gray-400">
                      {exception.status === "OPEN"
                        ? "Not authorized"
                        : exception.status === "RESOLVED"
                          ? "Resolved"
                          : "In review"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
