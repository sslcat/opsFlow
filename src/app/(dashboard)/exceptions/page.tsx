import { requirePagePermission } from "@/lib/auth"
import { getExceptionsPageData } from "@/lib/tenant-page-data"
import ResolveExceptionButton from "./resolve-exception-button"

export default async function ExceptionsPage() {
  const authorization = await requirePagePermission("exception.read")

  const exceptions = await getExceptionsPageData(authorization.organizationId)

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Exceptions
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">Description</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {exceptions.map((exception) => (
              <tr key={exception.id} className="border-b">
                <td className="p-4 font-semibold">
                  {exception.title}
                </td>

                <td className="p-4">
                  {exception.type}
                </td>

                <td className="p-4">
                  <span
                    className={
                      exception.status === "OPEN"
                        ? "text-red-600 font-semibold"
                        : "text-green-600 font-semibold"
                    }
                  >
                    {exception.status}
                  </span>
                </td>

                <td className="p-4">
                  {exception.description}
                </td>

                <td className="p-4">
                  {exception.status === "OPEN" &&
                  authorization.permissions.has("exception.resolve") ? (
                    <ResolveExceptionButton id={exception.id} />
                  ) : (
                    <span className="text-gray-400">
                      {exception.status === "OPEN" ? "Not authorized" : "Resolved"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
