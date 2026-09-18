import { authorizeApiRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUploadFilePath } from "@/lib/uploads"
import { readFile } from "fs/promises"
import PDFParser from "pdf2json"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("document.process")
  if (authorization.response) return authorization.response

  try {
    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return Response.json(
        { error: "documentId required" },
        { status: 400 }
      )
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: authorization.context.organizationId,
      },
    })

    if (!document) {
      return Response.json(
        { error: "Document not found" },
        { status: 404 },
      )
    }

    const fileBuffer = await readFile(getUploadFilePath(document.storageKey))

    const pdfParser = new PDFParser()

    const text = await new Promise<string>((resolve, reject) => {

      pdfParser.on("pdfParser_dataError", err => {
        reject(err)
      })

      pdfParser.on("pdfParser_dataReady", pdfData => {
        const pages = pdfData.Pages || []

        const extractedText = pages
          .flatMap((page) => page.Texts)
          .flatMap((textObj) => textObj.R)
          .map((run) => decodeURIComponent(run.T))
          .join(" ")

        resolve(extractedText)
      })

      pdfParser.parseBuffer(fileBuffer)
    })

    return Response.json({
      text
    })

  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error: "Extraction failed",
        details: error instanceof Error
          ? error.message
          : String(error)
      },
      {
        status: 500
      }
    )
  }
}
