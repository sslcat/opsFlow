"use client"

import { useState } from "react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload() {
    if (!file) {
      setMessage("Please choose a PDF file first.")
      return
    }

    setIsUploading(true)
    setMessage("Uploading...")

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
      setIsUploading(false)
      return
    }

    setMessage("File uploaded. Processing invoice...")

    const processResponse = await fetch("/api/process-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: uploadData.document.fileName,
      }),
    })

    const processData = await processResponse.json()

    if (!processResponse.ok) {
      setMessage(processData.error || "Invoice processing failed.")
      setIsUploading(false)
      return
    }

    setMessage("Invoice uploaded and processed successfully.")
    setIsUploading(false)
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
          onChange={(event) =>
            setFile(event.target.files?.[0] || null)
          }
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
    </div>
  )
}