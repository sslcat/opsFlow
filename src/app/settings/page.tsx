import { auth } from "@clerk/nextjs/server"

export default async function SettingsPage() {
  await auth.protect()

  return null
}
