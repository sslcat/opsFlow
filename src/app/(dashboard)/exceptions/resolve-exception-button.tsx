"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { secondaryButton } from "@/components/ui"

export default function ResolveExceptionButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function resolveException() {
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Could not resolve this exception. Try again."
        )
      }
      router.refresh()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Connection interrupted. Try again."
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <div>
      <button
        onClick={resolveException}
        disabled={pending}
        className={secondaryButton}
      >
        {pending ? "Resolving…" : "Resolve"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}
