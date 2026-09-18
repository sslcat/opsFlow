import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import { extractPdfText } from "../../../lib/invoice-extraction.ts"
import { prisma } from "../../../lib/prisma.ts"
import { readUpload } from "../../../lib/uploads.ts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("document.process")
  if (authorization.response) return authorization.response

  try {
    const body = await request.json()
    const { documentId } = body

    if (typeof documentId !== "string" || !documentId.trim()) {
      return apiError(400, "BAD_REQUEST", "documentId is required")
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: authorization.context.organizationId,
      },
    })

    if (!document) {
      return apiError(404, "NOT_FOUND", "Document not found")
    }

    const text = await extractPdfText(await readUpload(document.storageKey))

    return Response.json({
      text
    })

  } catch (error) {
    logServerError("PDF extraction", error)
    return apiError(500, "INTERNAL_ERROR", "Extraction failed")
  }
}
