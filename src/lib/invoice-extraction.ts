import "server-only"
import PDFParser from "pdf2json"

export async function extractPdfText(fileBuffer: Buffer) {
  const pdfParser = new PDFParser()
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pdfParser.destroy()
      reject(new Error("PDF text extraction timed out"))
    }, 10000)
    pdfParser.on("pdfParser_dataError", () => {
      clearTimeout(timer)
      reject(new Error("PDF text extraction failed"))
    })
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      clearTimeout(timer)
      try {
        resolve((pdfData.Pages ?? [])
          .flatMap(page => page.Texts)
          .flatMap(textObject => textObject.R)
          .map(run => decodeURIComponent(run.T))
          .join(" "))
      } catch {
        reject(new Error("Invalid PDF text encoding"))
      }
    })
    try { pdfParser.parseBuffer(fileBuffer) } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}
