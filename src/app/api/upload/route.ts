import { prisma } from "@/lib/prisma"
import { writeFile } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import path from "path"

export async function POST(request: Request) {
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
      `${uuidv4()}-${file.name}`

    const filePath =
      path.join(
        process.cwd(),
        "public/uploads",
        uniqueFileName
      )

    await writeFile(
      filePath,
      buffer
    )

    const document =
      await prisma.document.create({
        data: {
          fileName: uniqueFileName,
          type: type as any
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