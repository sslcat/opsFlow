"use client"

import { OrganizationSwitcher } from "@clerk/nextjs"
import { usePathname } from "next/navigation"

export function WorkspaceOrganizationSwitcher() {
  const pathname = usePathname()

  return (
    <OrganizationSwitcher
      afterSelectOrganizationUrl={pathname}
      afterSelectPersonalUrl={pathname}
      afterCreateOrganizationUrl={pathname}
      afterLeaveOrganizationUrl={pathname}
    />
  )
}
