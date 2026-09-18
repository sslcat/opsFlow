import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function getDashboardData() {
  const [organizationCount, documentCount, exceptions] = await Promise.all([
    prisma.organization.count(),
    prisma.document.count(),
    prisma.exception.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),
  ])

  return {
    organizationCount,
    documentCount,
    exceptions,
  }
}

export default async function DashboardPage() {
  await auth.protect()

  const data = await getDashboardData()

  const openExceptionCount =
    data.exceptions.filter(
      (exception) => exception.status === "OPEN"
    ).length

  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        OpsFlow Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-6 mb-8">

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">
            Organizations
          </div>

          <div className="text-4xl font-bold mt-2">
            {data.organizationCount}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">
            Documents
          </div>

          <div className="text-4xl font-bold mt-2">
            {data.documentCount}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">
            Open Exceptions
          </div>

          <div className="text-4xl font-bold mt-2 text-red-600">
            {openExceptionCount}
          </div>
        </div>

      </div>

      <div className="bg-white rounded-xl shadow p-6">

        <h2 className="text-2xl font-bold mb-4">
          Recent Exceptions
        </h2>

        <div className="space-y-4">

          {data.exceptions.map(
            (exception) => (
              <div
                key={exception.id}
                className="border rounded-lg p-4"
              >
                <div className="font-semibold">
                  {exception.title}
                </div>

                <div className="text-gray-600">
                  {exception.description}
                </div>
              </div>
            )
          )}

        </div>

      </div>

    </div>
  )
}
