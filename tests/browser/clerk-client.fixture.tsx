"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

export function ClerkProvider({ children }: { children: ReactNode }) {
  return children
}
export function UserButton() {
  return <button type="button">Test account</button>
}
export function SignIn() {
  return <h1>Sign in</h1>
}
export function SignUp() {
  return <h1>Sign up</h1>
}
export function OrganizationSwitcher({
  afterSelectOrganizationUrl,
}: {
  afterSelectOrganizationUrl?: string
  afterSelectPersonalUrl?: string
  afterCreateOrganizationUrl?: string
  afterLeaveOrganizationUrl?: string
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = "workspace-test=authorized; path=/; SameSite=Lax"
        router.push(afterSelectOrganizationUrl ?? "/dashboard")
        router.refresh()
      }}
    >
      Select test organization
    </button>
  )
}
