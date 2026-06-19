"use client"

import { useRouter } from "next/navigation"

export default function ResolveExceptionButton({
  id,
}: {
  id: string
}) {
  const router = useRouter()

  async function resolveException() {
    await fetch(`/api/exceptions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "RESOLVED",
      }),
    })

    router.refresh()
  }

  return (
    <button
      onClick={resolveException}
      className="bg-green-600 text-white px-4 py-2 rounded"
    >
      Resolve
    </button>
  )
}