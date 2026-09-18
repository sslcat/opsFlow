import { requireApiAuthentication } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureUploadDirectory, getUploadFilePath } from "@/lib/uploads"
import type { DocumentType } from "@prisma/client"
import { writeFile } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import path from "path"

export async function POST(request: Request) {
  const authenticationError = await requireApiAuthentication()
  if (authenticationError) return authenticationError

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

    const uniqueFileName =
      `${uuidv4()}-${path.basename(file.name)}`

    await ensureUploadDirectory()

    await writeFile(
      getUploadFilePath(uniqueFileName),
      buffer
    )

    const document =
      await prisma.document.create({
        data: {
          fileName: uniqueFileName,
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
