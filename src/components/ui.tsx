import Link from "next/link"
import type { ReactNode } from "react"

const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5",
  file: "M14 2H5v20h14V7l-5-5v5h5M8 12h8M8 16h6",
  orders: "M8 5H4v17h16V5h-4M8 2h8v6H8zM8 13h8M8 17h5",
  alert: "m12 3 10 18H2L12 3Zm0 5v6m0 3v1",
  check: "m5 12 4 4L19 6",
  sparkles:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6",
} as const

export type IconName = keyof typeof paths
export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

export function PageHeader({
  eyebrow = "WORKSPACE",
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
export function Card({
  children,
  className = "",
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "warning" | "ai"
}) {
  const colors = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    ai: "bg-indigo-50 text-indigo-700",
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors[tone]}`}
    >
      {children}
    </span>
  )
}
export function EmptyState({
  icon = "file",
  title,
  description,
  href,
  action,
}: {
  icon?: IconName
  title: string
  description: string
  href?: string
  action?: string
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 rounded-2xl bg-slate-50 p-4 text-indigo-500">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h2 className="font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
      {href && (
        <Link href={href} className={`${secondaryButton} mt-5`}>
          {action}
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
export function DataTable({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <table className="w-full min-w-[640px] text-left text-sm [&_th]:whitespace-nowrap [&_th]:text-xs [&_th]:font-medium [&_th]:text-slate-500 [&_thead]:bg-slate-50/80 [&_tr]:border-b [&_tr]:border-slate-100 [&_tbody_tr:last-child]:border-0 [&_tbody_tr]:transition [&_tbody_tr:hover]:bg-slate-50/60 [&_td]:text-slate-700">
        {children}
      </table>
    </div>
  )
}
