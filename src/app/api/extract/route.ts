import { requireApiAuthentication } from "@/lib/auth"
import { getUploadFilePath } from "@/lib/uploads"
import { readFile } from "fs/promises"
import PDFParser from "pdf2json"

export async function POST(request: Request) {
  const authenticationError = await requireApiAuthentication()
  if (authenticationError) return authenticationError

  try {
    const body = await request.json()
    const { fileName } = body

    if (!fileName) {
      return Response.json(
        { error: "fileName required" },
        { status: 400 }
      )
    }

    const fileBuffer = await readFile(getUploadFilePath(fileName))

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
