import { prisma } from "@/lib/prisma"
import { readFile } from "fs/promises"
import path from "path"
import PDFParser from "pdf2json"

async function extractPdfText(fileName: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    fileName
  )

  const fileBuffer = await readFile(filePath)

  const pdfParser = new PDFParser()

  return new Promise<string>((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", err => {
      reject(err)
    })

    pdfParser.on("pdfParser_dataReady", pdfData => {
      const pages = pdfData.Pages || []

      const text = pages
        .flatMap((page: any) => page.Texts)
        .flatMap((t: any) => t.R)
        .map((r: any) => decodeURIComponent(r.T))
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
  try {
    const body = await request.json()
    const { fileName } = body

    if (!fileName) {
      return Response.json(
        {
          error: "fileName is required"
        },
        {
          status: 400
        }
      )
    }

    const extractedText =
      await extractPdfText(fileName)

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

    const invoice =
      await prisma.invoice.create({
        data: {
          invoiceNumber: parsed.invoiceNumber,
          poNumber: parsed.poNumber,
          vendorName: parsed.vendorName,
          itemCode: parsed.itemCode,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice
        }
      })

    const order =
      await prisma.order.findFirst({
        where: {
          poNumber: parsed.poNumber
        }
      })

    if (!order) {
      await prisma.exception.create({
        data: {
          title: "Missing purchase order",
          description:
            `No purchase order found for invoice ${parsed.invoiceNumber}`,
          type: "MISSING_DOCUMENT",
          poNumber: parsed.poNumber
        }
      })
    } else {
      if (order.unitPrice !== parsed.unitPrice) {
        await prisma.exception.create({
          data: {
            title: "Invoice price mismatch",
            description:
              `PO ${parsed.poNumber} expected ${order.unitPrice}, invoice has ${parsed.unitPrice}`,
            type: "PRICE_MISMATCH",
            poNumber: parsed.poNumber
          }
        })
      }

      if (order.quantity !== parsed.quantity) {
        await prisma.exception.create({
          data: {
            title: "Invoice quantity mismatch",
            description:
              `PO ${parsed.poNumber} expected ${order.quantity}, invoice has ${parsed.quantity}`,
            type: "QUANTITY_MISMATCH",
            poNumber: parsed.poNumber
          }
        })
      }
    }

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