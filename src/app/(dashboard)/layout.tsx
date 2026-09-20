import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { WorkspaceNavigation } from "@/components/workspace-navigation"
import { Icon } from "@/components/ui"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()
  return (
    <div className="min-h-screen md:pl-56 lg:pl-60">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-200 bg-white md:overflow-y-auto md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-56 md:flex-col md:border-r md:border-b-0 lg:w-60">
        <Link
          href="/dashboard"
          aria-label="OpsFlow home"
          className="flex h-20 items-center gap-3 px-6"
        >
          <span className="rounded-xl bg-indigo-600 p-2 text-white shadow-sm">
            <Icon name="sparkles" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            OpsFlow<span className="text-indigo-500">.</span>
          </span>
        </Link>
        <p className="hidden px-7 pb-2 pt-5 text-[10px] font-semibold tracking-[0.18em] text-slate-500 md:block">
          ACCOUNTS PAYABLE
        </p>
        <WorkspaceNavigation />
        <div className="mx-4 mt-auto mb-5 hidden rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 md:block">
          <Icon name="sparkles" className="mb-3 h-5 w-5 text-indigo-600" />
          <p className="text-sm font-semibold text-slate-800">
            Less manual work.
            <br />
            More clarity.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Extract invoice data and understand discrepancies with AI.
          </p>
          <Link
            href="/upload"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-700"
          >
            Process an invoice <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
      <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 sm:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Icon name="shield" className="h-4 w-4" />
          <span>Accounts payable workspace</span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-xs text-slate-500 lg:block">
            Your account
          </span>
          <UserButton showName />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1600px] p-5 outline-none sm:p-8 lg:p-10"
      >
        {children}
      </main>
    </div>
  )
}
