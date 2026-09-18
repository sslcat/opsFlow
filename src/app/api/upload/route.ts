import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"
import { ensureUploadDirectory, getUploadFilePath } from "../../../lib/uploads.ts"
import type { DocumentType } from "@prisma/client"
import { writeFile } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import path from "path"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("document.upload")
  if (authorization.response) return authorization.response

  try {

    const formData = await request.formData()

    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return Response.json(
        {
          error: "No file uploaded"
        },
        {
          status: 400
        }
      )
    }

    const bytes = await file.arrayBuffer()

    const buffer = Buffer.from(bytes)

    const originalFileName = path.basename(file.name)
    const storageKey =
      `${authorization.context.organizationId}/${uuidv4()}`

    await ensureUploadDirectory(storageKey)

    await writeFile(
      getUploadFilePath(storageKey),
      buffer
    )

    const document =
      await prisma.document.create({
        data: {
          organizationId: authorization.context.organizationId,
          fileName: originalFileName,
          storageKey,
          type: type as DocumentType
        }
      })

    return Response.json({
      message: "Upload successful",
      document
    })

  } catch (error) {

    console.error(error)

    return Response.json(
      {
        error: "Upload failed"
      },
      {
        status: 500
      }
    )
  }
}
