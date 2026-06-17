import { readFile } from "fs/promises"
import path from "path"
import PDFParser from "pdf2json"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fileName } = body

    if (!fileName) {
      return Response.json(
        { error: "fileName required" },
        { status: 400 }
      )
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      fileName
    )

    const fileBuffer = await readFile(filePath)

    const pdfParser = new PDFParser()

    const text = await new Promise<string>((resolve, reject) => {

      pdfParser.on("pdfParser_dataError", err => {
        reject(err)
      })

      pdfParser.on("pdfParser_dataReady", pdfData => {
        const pages = pdfData.Pages || []

        const extractedText = pages
          .flatMap((page: any) => page.Texts)
          .flatMap((textObj: any) => textObj.R)
          .map((r: any) => decodeURIComponent(r.T))
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