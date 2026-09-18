import "server-only"

import { del, get, put } from "@vercel/blob"
import { mkdir, readFile, unlink, writeFile } from "fs/promises"
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

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

function assertVercelStorageConfigured() {
  if (process.env.VERCEL && !usesBlobStorage()) {
    throw new Error("Private Blob storage is not configured")
  }
}

export async function storeUpload(storageKey: string, contents: Buffer) {
  assertVercelStorageConfigured()

  if (usesBlobStorage()) {
    await put(storageKey, contents, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/pdf",
    })
    return
  }

  await ensureUploadDirectory(storageKey)
  await writeFile(getUploadFilePath(storageKey), contents)
}

export async function readUpload(storageKey: string) {
  assertVercelStorageConfigured()

  if (usesBlobStorage()) {
    const result = await get(storageKey, { access: "private" })
    if (!result || result.statusCode !== 200) {
      throw new Error("Uploaded document was not found")
    }

    return Buffer.from(await new Response(result.stream).arrayBuffer())
  }

  return readFile(getUploadFilePath(storageKey))
}

export async function deleteUpload(storageKey: string) {
  assertVercelStorageConfigured()

  if (usesBlobStorage()) {
    await del(storageKey)
    return
  }

  await unlink(getUploadFilePath(storageKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error
  })
}
