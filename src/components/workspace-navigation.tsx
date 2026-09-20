"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon, type IconName } from "./ui"

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/upload", label: "Upload invoice", icon: "upload" },
  { href: "/invoices", label: "Invoices", icon: "file" },
  { href: "/orders", label: "Purchase orders", icon: "orders" },
  { href: "/exceptions", label: "Exceptions", icon: "alert" },
  { href: "/settings", label: "Settings", icon: "settings" },
]
export function WorkspaceNavigation() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main navigation"
      className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:p-4"
    >
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {active && (
              <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-indigo-500 md:block" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
