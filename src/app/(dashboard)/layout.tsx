import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">

      <aside className="w-64 bg-gray-900 text-white p-6">

        <h1 className="text-2xl font-bold mb-8">
          OpsFlow
        </h1>

        <nav className="space-y-4">

          <Link
            href="/dashboard"
            className="block hover:text-blue-300"
          >
            Dashboard
          </Link>

          <Link
            href="/upload"
            className="block hover:text-blue-300"
          >
            Upload
          </Link>

          <Link
            href="/orders"
            className="block hover:text-blue-300"
          >
            Orders
          </Link>

          <Link
            href="/invoices"
            className="block hover:text-blue-300"
          >
            Invoices
          </Link>

          <Link
            href="/exceptions"
            className="block hover:text-blue-300"
          >
            Exceptions
          </Link>

          <Link
            href="/settings"
            className="block hover:text-blue-300"
          >
            Settings
          </Link>

        </nav>

      </aside>

      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>

    </div>
  )
}