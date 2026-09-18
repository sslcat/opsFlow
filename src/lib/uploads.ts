import "server-only"

import { mkdir } from "fs/promises"
import path from "path"

const uploadDirectory = path.join(process.cwd(), "storage", "uploads")

export async function ensureUploadDirectory(storageKey: string) {
  const filePath = getUploadFilePath(storageKey)
  await mkdir(path.dirname(filePath), { recursive: true })
}

export function getUploadFilePath(storageKey: string) {
  const filePath = path.resolve(uploadDirectory, storageKey)
  const uploadRoot = `${path.resolve(uploadDirectory)}${path.sep}`

  if (!filePath.startsWith(uploadRoot)) {
    throw new Error("Invalid upload storage key")
  }

  return filePath
}
