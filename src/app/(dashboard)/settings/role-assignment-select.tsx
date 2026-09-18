"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type RoleOption = {
  key: string
  name: string
}

export default function RoleAssignmentSelect({
  membershipId,
  currentRoleKey,
  roles,
}: {
  membershipId: string
  currentRoleKey: string
  roles: RoleOption[]
}) {
  const router = useRouter()
  const [selectedRoleKey, setSelectedRoleKey] = useState(currentRoleKey)
  const [message, setMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function assignRole() {
    setIsSaving(true)
    setMessage("")

    const response = await fetch(`/api/memberships/${membershipId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleKey: selectedRoleKey }),
    })
    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error ?? "Role assignment failed")
      setIsSaving(false)
      return
    }

    setMessage("Saved")
    setIsSaving(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          aria-label="Business role"
          className="rounded border border-gray-300 px-3 py-2"
          disabled={isSaving}
          onChange={(event) => setSelectedRoleKey(event.target.value)}
          value={selectedRoleKey}
        >
          {roles.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
          disabled={isSaving || selectedRoleKey === currentRoleKey}
          onClick={assignRole}
          type="button"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  )
}
