import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"
import { getUploadFilePath } from "../../../lib/uploads.ts"
import { readFile } from "fs/promises"
import PDFParser from "pdf2json"

async function extractPdfText(storageKey: string) {
  const fileBuffer = await readFile(getUploadFilePath(storageKey))

  const pdfParser = new PDFParser()

  return new Promise<string>((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", err => {
      reject(err)
    })

    pdfParser.on("pdfParser_dataReady", pdfData => {
      const pages = pdfData.Pages || []

      const text = pages
        .flatMap((page) => page.Texts)
        .flatMap((textObject) => textObject.R)
        .map((run) => decodeURIComponent(run.T))
        .join(" ")

      resolve(text)
    })

    pdfParser.parseBuffer(fileBuffer)
  })
}

function parseInvoice(text: string) {
  const lineItemMatch =
    text.match(
      /(ITEM-[A-Z0-9-]+)\s+(.+?)\s+(\d+)\s+\$(\d+(?:\.\d+)?)\s+\$[\d,]+(?:\.\d+)?/i
    )

  return {
    invoiceNumber:
      text.match(/Invoice Number:\s*([A-Z0-9-]+)/i)?.[1],

    poNumber:
      text.match(/Purchase Order:\s*([A-Z0-9-]+)/i)?.[1],

    vendorName:
      text.match(/Vendor:\s*(.*?)(?=\s+Bill To:)/i)?.[1]?.trim(),

    itemCode:
      lineItemMatch?.[1],

    quantity:
      Number(lineItemMatch?.[3]),

    unitPrice:
      Number(lineItemMatch?.[4])
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest([
    "document.process",
    "invoice.process",
  ])
  if (authorization.response) return authorization.response
  const { organizationId } = authorization.context

  try {
    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return Response.json(
        {
          error: "documentId is required"
        },
        {
          status: 400
        }
      )
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
        type: "INVOICE",
      },
    })

    if (!document) {
      return Response.json(
        { error: "Document not found" },
        { status: 404 },
      )
    }

    const extractedText =
      await extractPdfText(document.storageKey)

    console.log("EXTRACTED TEXT:", extractedText)

    const parsed =
      parseInvoice(extractedText)

    if (
      !parsed.invoiceNumber ||
      !parsed.poNumber ||
      !parsed.vendorName ||
      !parsed.itemCode ||
      Number.isNaN(parsed.quantity) ||
      Number.isNaN(parsed.unitPrice)
    ) {
      await prisma.document.update({
        where: {
          id_organizationId: {
            id: document.id,
            organizationId,
          },
        },
        data: { status: "FAILED" },
      })

      return Response.json(
        {
          error: "Could not extract all required invoice fields",
          parsed,
          extractedText
        },
        {
          status: 400
        }
      )
    }

    const invoiceNumber = parsed.invoiceNumber
    const poNumber = parsed.poNumber
    const vendorName = parsed.vendorName
    const itemCode = parsed.itemCode

    const invoice = await prisma.$transaction(async (transaction) => {
      const createdInvoice = await transaction.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          poNumber,
          vendorName,
          itemCode,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice
        }
      })

      const order = await transaction.order.findFirst({
        where: {
          organizationId,
          poNumber
        }
      })

      if (!order) {
        await transaction.exception.create({
          data: {
            organizationId,
            title: "Missing purchase order",
            description:
              `No purchase order found for invoice ${invoiceNumber}`,
            type: "MISSING_DOCUMENT",
            poNumber
          }
        })
      } else {
        if (order.unitPrice !== parsed.unitPrice) {
          await transaction.exception.create({
            data: {
              organizationId,
              title: "Invoice price mismatch",
              description:
                `PO ${poNumber} expected ${order.unitPrice}, invoice has ${parsed.unitPrice}`,
              type: "PRICE_MISMATCH",
              poNumber
            }
          })
        }

        if (order.quantity !== parsed.quantity) {
          await transaction.exception.create({
            data: {
              organizationId,
              title: "Invoice quantity mismatch",
              description:
                `PO ${poNumber} expected ${order.quantity}, invoice has ${parsed.quantity}`,
              type: "QUANTITY_MISMATCH",
              poNumber
            }
          })
        }
      }

      await transaction.document.update({
        where: {
          id_organizationId: {
            id: document.id,
            organizationId,
          },
        },
        data: { status: "PARSED" },
      })

      return createdInvoice
    })

    return Response.json({
      message: "Invoice processed",
      parsed,
      invoice
    })

  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : String(error)
      },
      {
        status: 500
      }
    )
  }
}
