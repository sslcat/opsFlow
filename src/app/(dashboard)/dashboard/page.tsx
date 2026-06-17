async function getDashboardData() {
  const [
    orgRes,
    docRes,
    excRes
  ] = await Promise.all([
    fetch("http://localhost:3000/api/organizations", {
      cache: "no-store"
    }),
    fetch("http://localhost:3000/api/documents", {
      cache: "no-store"
    }),
    fetch("http://localhost:3000/api/exceptions", {
      cache: "no-store"
    })
  ])

  const organizations = await orgRes.json()
  const documents = await docRes.json()
  const exceptions = await excRes.json()

  return {
    organizations,
    documents,
    exceptions
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const orgCount =
    data.organizations.organizations.length

  const docCount =
    data.documents.documents.length

  const openExceptionCount =
    data.exceptions.exceptions.filter(
      (e: any) => e.status === "OPEN"
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
            {orgCount}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">
            Documents
          </div>

          <div className="text-4xl font-bold mt-2">
            {docCount}
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

          {data.exceptions.exceptions.map(
            (exception: any) => (
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