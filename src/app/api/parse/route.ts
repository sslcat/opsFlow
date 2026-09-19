import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"
import { extractInvoice, toParsedInvoice } from "../../../lib/extraction/engine.ts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("invoice.process")
  if (authorization.response) return authorization.response
  try {
    const body: unknown = await request.json()
    const text = typeof body === "object" && body !== null && "text" in body ? body.text : null
    if (typeof text !== "string" || !text.trim()) return apiError(400, "BAD_REQUEST", "text is required")
    const extraction = await extractInvoice({ document: null, text, metadata: { documentId: null, fileName: null } })
    if (!extraction.invoice || extraction.errors.length) return apiError(400, "BAD_REQUEST", extraction.errors.join("; "))
    return Response.json(toParsedInvoice(extraction.invoice))
  } catch (error) {
    logServerError("Invoice parsing", error)
    return apiError(500, "INTERNAL_ERROR", "Parsing failed")
  }
}
