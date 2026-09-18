import "server-only"

import { auth } from "@clerk/nextjs/server"

export async function requireApiAuthentication() {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    )
  }

  return null
}
