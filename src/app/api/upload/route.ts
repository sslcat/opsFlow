import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import { prisma } from "../../../lib/prisma.ts"
import { deleteUpload, storeUpload } from "../../../lib/uploads.ts"
import { DocumentType } from "@prisma/client"
import { v4 as uuidv4 } from "uuid"
import path from "path"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const allowedDocumentTypes = new Set<string>(Object.values(DocumentType))

function isPdf(buffer: Buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-"
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("document.upload")
  if (authorization.response) return authorization.response

  try {
    const formData = await request.formData()

    const file = formData.get("file")
    const type = formData.get("type")

    if (!(file instanceof File)) {
      return apiError(400, "BAD_REQUEST", "A PDF file is required")
    }

    if (typeof type !== "string" || !allowedDocumentTypes.has(type)) {
      return apiError(400, "BAD_REQUEST", "A valid document type is required")
    }

    if (file.size === 0) {
      return apiError(400, "BAD_REQUEST", "The uploaded PDF is empty")
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError(400, "BAD_REQUEST", "PDF files must be 4 MB or smaller")
    }

    if (file.type && file.type !== "application/pdf") {
      return apiError(400, "BAD_REQUEST", "Only PDF files are supported")
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!isPdf(buffer)) {
      return apiError(400, "BAD_REQUEST", "The uploaded file is not a valid PDF")
    }

    const originalFileName = path.basename(file.name).slice(0, 255) || "invoice.pdf"
    const storageKey = `${authorization.context.organizationId}/${uuidv4()}.pdf`

    await storeUpload(storageKey, buffer)

    try {
      const document = await prisma.document.create({
        data: {
          organizationId: authorization.context.organizationId,
          fileName: originalFileName,
          storageKey,
          type: type as DocumentType,
        },
      })

      return Response.json({
        message: "Upload successful",
        document,
      })
    } catch (error) {
      await deleteUpload(storageKey).catch((cleanupError) => {
        logServerError("Upload cleanup", cleanupError)
      })
      throw error
    }
  } catch (error) {
    logServerError("Upload", error)
    return apiError(500, "INTERNAL_ERROR", "Upload failed")
  }
}
