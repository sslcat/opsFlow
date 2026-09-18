import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()

  return (
    <div className="flex min-h-screen">

      <aside className="flex w-64 flex-col bg-gray-900 p-6 text-white">

        <h1 className="text-2xl font-bold mb-8">
          OpsFlow
        </h1>

        <nav className="flex-1 space-y-4">

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

        <div className="border-t border-gray-700 pt-6">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonOuterIdentifier: "text-white",
              },
            }}
          />
        </div>

      </aside>

      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>

    </div>
  )
}
