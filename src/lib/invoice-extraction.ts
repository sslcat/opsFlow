import "server-only"

import PDFParser from "pdf2json"

export type ParsedInvoice = {
  invoiceNumber?: string
  poNumber?: string
  vendorName?: string
  itemCode?: string
  quantity: number
  unitPrice: number
}

export async function extractPdfText(fileBuffer: Buffer) {
  const pdfParser = new PDFParser()

  return new Promise<string>((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", reject)
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = (pdfData.Pages ?? [])
        .flatMap((page) => page.Texts)
        .flatMap((textObject) => textObject.R)
        .map((run) => decodeURIComponent(run.T))
        .join(" ")

      resolve(text)
    })

    pdfParser.parseBuffer(fileBuffer)
  })
}

export function parseInvoice(text: string): ParsedInvoice {
  const lineItemMatch = text.match(
    /(ITEM-[A-Z0-9-]+)\s+(.+?)\s+(\d+)\s+\$(\d+(?:\.\d+)?)\s+\$[\d,]+(?:\.\d+)?/i,
  )

  return {
    invoiceNumber: text.match(/Invoice Number:\s*([A-Z0-9-]+)/i)?.[1],
    poNumber: text.match(/Purchase Order:\s*([A-Z0-9-]+)/i)?.[1],
    vendorName: text.match(/Vendor:\s*(.*?)(?=\s+Bill To:)/i)?.[1]?.trim(),
    itemCode: lineItemMatch?.[1],
    quantity: Number(lineItemMatch?.[3]),
    unitPrice: Number(lineItemMatch?.[4]),
  }
}

export function isCompleteParsedInvoice(
  parsed: ParsedInvoice,
): parsed is ParsedInvoice & {
  invoiceNumber: string
  poNumber: string
  vendorName: string
  itemCode: string
} {
  return Boolean(
    parsed.invoiceNumber &&
      parsed.poNumber &&
      parsed.vendorName &&
      parsed.itemCode &&
      Number.isInteger(parsed.quantity) &&
      parsed.quantity > 0 &&
      Number.isFinite(parsed.unitPrice) &&
      parsed.unitPrice >= 0,
  )
}
