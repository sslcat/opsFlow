import { prisma } from "@/lib/prisma"

export default async function Home() {

  // Get counts from database
  const organizationCount =
    await prisma.organization.count()

  const documentCount =
    await prisma.document.count()

  const openExceptionCount =
    await prisma.exception.count({
      where: {
        status: "OPEN"
      }
    })

  // Get recent exceptions
  const recentExceptions =
    await prisma.exception.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })

  return (
    <main className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-10">

          <h1 className="text-4xl font-bold">
            OpsFlow
          </h1>

          <p className="text-gray-600 mt-2">
            AI-powered operations exception management
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-sm text-gray-500">
              Organizations
            </h2>

            <p className="text-3xl font-bold mt-2">
              {organizationCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-sm text-gray-500">
              Documents
            </h2>

            <p className="text-3xl font-bold mt-2">
              {documentCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-sm text-gray-500">
              Open Exceptions
            </h2>

            <p className="text-3xl font-bold mt-2 text-red-600">
              {openExceptionCount}
            </p>
          </div>

        </div>

        <div className="mt-10 bg-white rounded-xl shadow p-6">

          <h2 className="text-xl font-bold mb-4">
            Recent Exceptions
          </h2>

          <div className="space-y-4">

            {recentExceptions.map((exception) => (

              <div
                key={exception.id}
                className="border rounded-lg p-4"
              >

                <p className="font-semibold">
                  {exception.title}
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  {exception.description}
                </p>

              </div>

            ))}

          </div>

        </div>

      </div>

    </main>
  )
}