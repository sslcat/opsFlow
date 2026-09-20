"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export function ClerkProvider({ children }: { children: ReactNode }) {
  return children
}
const subscribe = (listener: () => void) => {
  window.addEventListener("workspace-auth-change", listener)
  return () => window.removeEventListener("workspace-auth-change", listener)
}
const snapshot = () => document.cookie
export function useAuth() {
  const cookie = useSyncExternalStore(subscribe, snapshot, () => "")
  const mode = cookie.match(/(?:^|; )workspace-test=([^;]*)/)?.[1] ?? "missing"
  return {
    isLoaded: mode !== "loading",
    userId:
      mode === "anonymous" ? null : mode === "user-b" ? "user-b" : "test-user",
    orgId: ["missing", "anonymous"].includes(mode)
      ? null
      : mode === "tenant-b"
        ? "org-b"
        : "org-a",
  }
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
        window.dispatchEvent(new Event("workspace-auth-change"))
        router.push(afterSelectOrganizationUrl ?? "/dashboard")
        router.refresh()
      }}
    >
      Select test organization
    </button>
  )
}
