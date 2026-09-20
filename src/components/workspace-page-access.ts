import "server-only"

import { redirect } from "next/navigation"
import { authorizeApiRequest } from "@/lib/auth"
import type { PermissionKey } from "@/lib/authorization-policy"

// Reuse the existing authorization decision. A denied workspace page is a
// recoverable access state, not a missing route. API behavior stays unchanged.
export async function getWorkspacePageContext(
  required: PermissionKey | readonly PermissionKey[]
) {
  const authorization = await authorizeApiRequest(required)

  if (authorization.response?.status === 401) {
    redirect("/sign-in")
  }

  return authorization.context
}
