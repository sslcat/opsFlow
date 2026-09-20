import Link from "next/link"
import { getWorkspacePageContext } from "@/components/workspace-page-access"
import { WorkspaceAccessState } from "@/components/workspace-access-state"
import { getDashboardData, getInvoicesPageData } from "@/lib/tenant-page-data"
import {
  Badge,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  primaryButton,
  type IconName,
} from "@/components/ui"

export default async function DashboardPage() {
  const authorization = await getWorkspacePageContext([
    "organization.read",
    "document.read",
    "exception.read",
  ])
  if (!authorization) return <WorkspaceAccessState />

  const [data, invoices] = await Promise.all([
    getDashboardData(authorization.organizationId),
    authorization.permissions.has("invoice.read")
      ? getInvoicesPageData(authorization.organizationId)
      : Promise.resolve(null),
  ])
  const open = data.exceptions.filter((item) => item.status === "OPEN")
  const resolved = data.exceptions.filter(
    (item) => item.status === "RESOLVED"
  ).length
  const inReview = data.exceptions.filter(
    (item) => item.status === "IN_REVIEW"
  ).length
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  )
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000)
    return {
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      date: date.toISOString().slice(0, 10),
      count:
        invoices?.filter(
          (invoice) =>
            invoice.createdAt.toISOString().slice(0, 10) ===
            date.toISOString().slice(0, 10)
        ).length ?? 0,
    }
  })
  const weekCount = days.reduce((sum, day) => sum + day.count, 0)
  const peak = Math.max(1, ...days.map((day) => day.count))
  const recent = [
    ...data.exceptions.map((item) => ({
      id: `exception-${item.id}`,
      title: item.title,
      detail: "Exception recorded",
      date: item.createdAt,
      href: "/exceptions",
      icon: "alert" as const,
    })),
    ...(invoices ?? []).map((item) => ({
      id: `invoice-${item.id}`,
      title: item.invoiceNumber,
      detail: item.vendorName ?? "Invoice recorded",
      date: item.createdAt,
      href: "/invoices",
      icon: "file" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
  const metrics: {
    label: string
    value: number | string
    detail: string
    icon: IconName
    href: string
  }[] = [
    {
      label: "Invoices recorded",
      value: invoices?.length ?? "—",
      detail: invoices
        ? `${weekCount} recorded in the last 7 days`
        : "Invoice access required",
      icon: "file",
      href: "/invoices",
    },
    {
      label: "Documents uploaded",
      value: data.documentCount,
      detail: "Across the active organization",
      icon: "upload",
      href: "/upload",
    },
    {
      label: "Open exceptions",
      value: open.length,
      detail: open.length ? "Ready for your review" : "No open exceptions",
      icon: "alert",
      href: "/exceptions",
    },
    {
      label: "Exceptions resolved",
      value: resolved,
      detail: `${inReview} currently in review`,
      icon: "check",
      href: "/exceptions",
    },
  ]
  return (
    <div>
      <PageHeader
        eyebrow="YOUR OPERATIONS, AT A GLANCE"
        title="Overview"
        description="A clearer picture of your invoices. A focused path to what needs you."
        action={
          <Link href="/upload" className={primaryButton}>
            <Icon name="upload" className="h-4 w-4" />
            Upload invoice
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            href={metric.href}
            key={metric.label}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>
              <Icon
                name={metric.icon}
                className="h-4 w-4 text-slate-500 group-hover:text-indigo-500"
              />
            </div>
            <p
              className={`mt-4 text-3xl font-semibold tracking-tight tabular-nums ${metric.icon === "alert" && open.length ? "text-amber-700" : "text-slate-950"}`}
            >
              {typeof metric.value === "number"
                ? metric.value.toLocaleString("en-US")
                : metric.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
          </Link>
        ))}
      </div>
      <section
        aria-labelledby="copilot-heading"
        className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-start gap-5">
          <span className="rounded-xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-200">
            <Icon name="sparkles" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="copilot-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Your AI-powered workspace
              </h2>
              <Badge tone="ai">Invoice intelligence</Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {open.length
                ? `${open.length} open ${open.length === 1 ? "exception needs" : "exceptions need"} a closer look. Review the queue to investigate discrepancies and keep work moving.`
                : data.documentCount
                  ? "Your open exception queue is clear. Process your next invoice to extract its details, compare purchase order terms, and get AI explanations when available."
                  : "Start with an invoice. OpsFlow extracts the details, checks purchase order quantities and prices, and offers AI explanations to help you decide what to do next."}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Operational summary from current records. AI summaries and
              recommendations appear after upload and are not saved.
            </p>
            <Link
              href={open.length ? "/exceptions" : "/upload"}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"
            >
              {open.length
                ? "Review exceptions"
                : data.documentCount
                  ? "Process another invoice"
                  : "Process your first invoice"}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Needs your attention</h2>
              <Badge tone={open.length ? "warning" : "success"}>
                {open.length} open
              </Badge>
            </div>
            <Link
              href="/exceptions"
              className="text-xs font-semibold text-indigo-700"
            >
              View all
            </Link>
          </div>
          {open.length ? (
            <div className="divide-y divide-slate-100">
              {open.slice(0, 4).map((item) => (
                <Link
                  href="/exceptions"
                  key={item.id}
                  className="flex items-start gap-3 px-6 py-4 transition hover:bg-slate-50"
                >
                  <span className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-700">
                    <Icon name="alert" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.description ??
                        "Review this exception to determine the next action."}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-slate-500">
                      {item.poNumber ?? "No purchase order reference"}
                    </p>
                  </div>
                  <Icon name="arrow" className="mt-2 h-4 w-4 text-slate-500" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="check"
              title="No open exceptions"
              description="New discrepancies will appear here when invoices are processed. Review the full queue for any items already in review."
            />
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Invoice activity</h2>
            <Badge>Last 7 days · UTC</Badge>
          </div>
          {invoices ? (
            <>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">
                  {weekCount}
                </span>
                <span className="text-xs text-slate-500">
                  invoices recorded
                </span>
              </div>
              <div
                className="mt-6 flex h-36 items-end gap-3"
                role="img"
                aria-label={`Invoices recorded by day: ${days.map((day) => `${day.date}: ${day.count}`).join(", ")}`}
              >
                {days.map((day) => (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-[11px] text-slate-500">
                      {day.count}
                    </span>
                    <div
                      className={`w-full max-w-10 rounded-t-md ${day.count ? "bg-indigo-500" : "bg-slate-100"}`}
                      style={{
                        height: `${day.count ? Math.max(8, (day.count / peak) * 90) : 3}px`,
                      }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                {weekCount
                  ? "Recorded invoices, grouped by creation date. Processing does not mean payment approval."
                  : "Your activity will take shape as invoices are recorded."}
              </p>
            </>
          ) : (
            <EmptyState
              title="Invoice access required"
              description="Your role does not include access to invoice statistics."
            />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold">Recent activity</h2>
            <span className="text-xs text-slate-500">
              Latest recorded invoices & exceptions
            </span>
          </div>
          {recent.length ? (
            <div className="divide-y divide-slate-100">
              {recent.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50"
                >
                  <span className="rounded-lg bg-slate-50 p-2 text-slate-500">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.detail}
                    </p>
                  </div>
                  <time
                    dateTime={item.date.toISOString()}
                    className="text-xs text-slate-500"
                  >
                    {item.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="clock"
              title="Your workspace starts here"
              description="Upload an invoice to begin. Newly recorded invoices and exceptions will appear in this feed."
              href="/upload"
              action="Upload invoice"
            />
          )}
        </Card>
      </div>
    </div>
  )
}
