import { authorizeApiRequest } from "../../../lib/auth.ts"
import { apiError, logServerError } from "../../../lib/api-response.ts"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("invoice.process")
  if (authorization.response) return authorization.response

  try {

    const body = await request.json()

    const { text } = body

    if (typeof text !== "string" || !text.trim()) {
      return apiError(400, "BAD_REQUEST", "text is required")
    }

    const invoiceNumber =
      text.match(
        /Invoice Number:\s*([A-Z0-9-]+)/i
      )?.[1]

    const poNumber =
      text.match(
        /Purchase Order:\s*([A-Z0-9-]+)/i
      )?.[1]

    const vendorName =
  text.match(
    /Vendor:\s*(.*?)(?=\s+Quantity:)/i
  )?.[1]?.trim()

    const quantity =
      Number(
        text.match(
          /Quantity:\s*(\d+)/i
        )?.[1]
      )

    const unitPrice =
      Number(
        text.match(
          /Unit Price:\s*\$?(\d+(\.\d+)?)/i
        )?.[1]
      )

    return Response.json({
      invoiceNumber,
      poNumber,
      vendorName,
      quantity,
      unitPrice
    })

  }
  catch (error) {

    logServerError("Invoice parsing", error)
    return apiError(500, "INTERNAL_ERROR", "Parsing failed")
  }
}
