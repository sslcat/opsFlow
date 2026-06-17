export async function POST(request: Request) {
  try {

    const body = await request.json()

    const { text } = body

    if (!text) {
      return Response.json(
        {
          error: "text required"
        },
        {
          status: 400
        }
      )
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

    console.error(error)

    return Response.json(
      {
        error: "Parsing failed"
      },
      {
        status: 500
      }
    )
  }
}