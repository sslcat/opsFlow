import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function scenario() {
  return (await cookies()).get("workspace-test")?.value ?? "missing"
}

async function session() {
  const mode = await scenario()
  return {
    userId: mode === "anonymous" ? null : "test-user",
    orgId: ["missing", "anonymous"].includes(mode)
      ? null
      : mode === "tenant-b"
        ? "org-b"
        : "org-a",
  }
}

export const auth = Object.assign(session, {
  protect: async () => {
    const value = await session()
    if (!value.userId) redirect("/sign-in")
    return value
  },
})

export function clerkMiddleware() {
  return () => undefined
}
