import { requirePagePermission } from "@/lib/auth"

export default async function SettingsPage() {
  await requirePagePermission("organization.read")

  return null
}
