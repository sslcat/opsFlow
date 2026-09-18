import "server-only"

import { mkdir } from "fs/promises"
import path from "path"

const uploadDirectory = path.join(process.cwd(), "storage", "uploads")

export async function ensureUploadDirectory() {
  await mkdir(uploadDirectory, { recursive: true })
}

export function getUploadFilePath(fileName: string) {
  const safeFileName = path.basename(fileName)

  if (safeFileName !== fileName) {
    throw new Error("Invalid upload file name")
  }

  return path.join(uploadDirectory, safeFileName)
}
