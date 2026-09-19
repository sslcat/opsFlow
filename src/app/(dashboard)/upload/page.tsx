"use client"

import { useState } from "react"
import type { InsightsResult } from "../../../lib/insights/types"
import { InvoiceInsightsPanel } from "./invoice-insights"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [insights, setInsights] = useState<InsightsResult | null>(null)

  async function handleUpload() {
    setInsights(null)
    if (!file) {
      setMessage("Please choose a PDF file first.")
      return
    }

    setIsUploading(true)
    setMessage("Uploading...")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "INVOICE")

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        setMessage(uploadData.error || "Upload failed.")
        return
      }

      setMessage("File uploaded. Processing invoice...")

      const processResponse = await fetch("/api/process-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: uploadData.document.id,
        }),
      })

      const processData = await processResponse.json()

      if (!processResponse.ok) {
        setMessage(processData.error || "Invoice processing failed.")
        return
      }

      setMessage("Invoice uploaded and processed successfully.")
      setInsights(processData.insights ?? { status: "UNAVAILABLE", insights: null })
    } catch {
      setMessage("The upload could not be completed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Upload Invoice
      </h1>

      <div className="bg-white rounded-xl shadow p-8">
        <input
          type="file"
          accept=".pdf"
          aria-label="Invoice PDF"
          disabled={isUploading}
          onChange={(event) => {
            setFile(event.target.files?.[0] || null)
            setInsights(null)
            setMessage("")
          }}
          className="mb-4"
        />

        <br />

        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
        >
          {isUploading ? "Processing..." : "Upload"}
        </button>

        {message && (
          <p className="mt-4 text-gray-700">
            {message}
          </p>
        )}
      </div>
      {insights && <InvoiceInsightsPanel result={insights} />}
    </div>
  )
}
