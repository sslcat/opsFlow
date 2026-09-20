"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import type { InsightsResult } from "@/lib/insights/types"
import type { ExtractionResult } from "@/lib/extraction/types"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  primaryButton,
  secondaryButton,
} from "@/components/ui"
import { InvoiceInsightsPanel } from "./invoice-insights"
import { UploadProgress, type UploadPhase } from "./upload-progress"

type ProcessResult = {
  invoice: {
    invoiceNumber: string
    poNumber: string
    vendorName: string | null
    quantity: number
    unitPrice: number
  }
  extraction?: ExtractionResult
  insights?: InsightsResult
  idempotent?: boolean
}

function uploadDocument(
  file: File,
  onProgress: (value: number | null) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", "/api/upload")
    request.responseType = "json"
    request.timeout = 90000
    request.upload.onprogress = (event) =>
      onProgress(
        event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : null
      )
    request.onerror = () =>
      reject(
        new Error(
          "The upload connection was interrupted. Check your connection and try again."
        )
      )
    request.ontimeout = () =>
      reject(
        new Error(
          "The upload timed out. Check your documents before uploading again."
        )
      )
    request.onload = () => {
      const data = request.response
      if (request.status < 200 || request.status >= 300) {
        reject(
          new Error(
            typeof data?.error === "string"
              ? data.error
              : "The PDF could not be uploaded. Please try again."
          )
        )
      } else if (typeof data?.document?.id !== "string") {
        reject(
          new Error(
            "The server did not return a document reference. Check your documents before uploading again."
          )
        )
      } else {
        resolve(data.document.id)
      }
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "INVOICE")
    request.send(formData)
  })
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<UploadPhase>("idle")
  const [progress, setProgress] = useState<number | null>(0)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  const isBusy = phase === "uploading" || phase === "processing"
  const insights = result
    ? (result.insights ?? { status: "UNAVAILABLE" as const, insights: null })
    : null

  function selectFile(files: FileList | null) {
    if (busy.current) return
    const selected = files?.[0]
    if (!selected) return
    if (
      files.length !== 1 ||
      !selected.name.toLowerCase().endsWith(".pdf") ||
      (selected.type && selected.type !== "application/pdf") ||
      selected.size === 0 ||
      selected.size > 4 * 1024 * 1024
    ) {
      setError("Choose one non-empty PDF, up to 4 MB.")
      if (input.current) input.current.value = ""
      return
    }
    setFile(selected)
    setDocumentId(null)
    setResult(null)
    setProgress(0)
    setPhase("idle")
    setError("")
  }

  function reset() {
    setFile(null)
    setDocumentId(null)
    setResult(null)
    setProgress(0)
    setPhase("idle")
    setError("")
    if (input.current) input.current.value = ""
    input.current?.focus()
  }

  async function handleUpload() {
    if (!file || busy.current) return
    busy.current = true
    setError("")
    setResult(null)
    try {
      let sourceId = documentId
      if (!sourceId) {
        setPhase("uploading")
        setProgress(0)
        sourceId = await uploadDocument(file, setProgress)
        setDocumentId(sourceId)
      }
      setPhase("processing")
      const response = await fetch("/api/process-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: sourceId }),
        signal: AbortSignal.timeout(90000),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Invoice processing failed. Retry this document or choose another PDF."
        )
      if (!data.invoice)
        throw new Error(
          "The processing result could not be confirmed. Retry this document to check its status."
        )
      setResult(data)
      setPhase("complete")
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.name !== "TimeoutError" &&
          cause.name !== "SyntaxError"
          ? cause.message
          : "The processing result could not be confirmed. Retry to check the same document safely."
      )
      setPhase("error")
    } finally {
      busy.current = false
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI INVOICE PROCESSING"
        title="Let your invoices do the talking."
        description="Upload a PDF. Get structured details, purchase order checks, and AI-powered explanations in one flow."
      />
      {insights && (
        <div className="mb-6">
          <InvoiceInsightsPanel result={insights} />
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Upload invoice</h2>
              <Badge>PDF · Up to 4 MB</Badge>
            </div>
            <label
              onDragEnter={(event) => {
                event.preventDefault()
                if (!isBusy) setDragging(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = isBusy ? "none" : "copy"
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                )
                  setDragging(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                if (!isBusy) selectFile(event.dataTransfer.files)
              }}
              className={`relative flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-4 ${isBusy ? "cursor-wait border-slate-200 bg-slate-50" : "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50"} ${dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50/50"}`}
            >
              <input
                ref={input}
                type="file"
                accept=".pdf,application/pdf"
                aria-label="Invoice PDF"
                aria-describedby="upload-help"
                disabled={isBusy}
                onChange={(event) => selectFile(event.target.files)}
                className="sr-only"
              />
              <span className="mb-5 rounded-2xl border border-indigo-100 bg-white p-4 text-indigo-600 shadow-sm">
                <Icon name={file ? "file" : "upload"} className="h-8 w-8" />
              </span>
              <span className="text-base font-semibold text-slate-800">
                {dragging
                  ? "Drop your invoice here"
                  : file
                    ? phase === "complete"
                      ? "Invoice processed"
                      : isBusy
                        ? "Working on your invoice"
                        : "Your invoice is ready"
                    : "Drag and drop your invoice"}
              </span>
              <span className="mt-2 text-sm text-slate-500">
                {file ? (
                  "Choose another PDF to replace this file"
                ) : (
                  <>
                    or{" "}
                    <span className="font-semibold text-indigo-600 underline underline-offset-4">
                      browse files
                    </span>{" "}
                    on your device
                  </>
                )}
              </span>
              <span
                id="upload-help"
                className="mt-4 max-w-sm text-xs leading-5 text-slate-500"
              >
                Use a text-based PDF with one invoice line. Scanned documents
                and multiple lines are not supported yet.
              </span>
            </label>
            {file && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Icon name="file" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB · PDF document
                  </p>
                </div>
                {!isBusy && phase !== "complete" && (
                  <button
                    onClick={reset}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    aria-label="Remove selected invoice"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
              >
                <p className="font-semibold">
                  {phase === "error"
                    ? "We couldn’t complete this step"
                    : "Check your file"}
                </p>
                <p className="mt-1 break-words">{error}</p>
                {documentId && phase === "error" && (
                  <p className="mt-2 text-xs">
                    Your PDF is uploaded. Retry uses the same document, so
                    processing won’t create a duplicate invoice.
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Icon name="shield" className="h-4 w-4" />
                Private to your organization
              </p>
              {phase === "complete" ? (
                <button className={secondaryButton} onClick={reset}>
                  Upload another invoice
                </button>
              ) : (
                <button
                  className={primaryButton}
                  disabled={!file || isBusy}
                  onClick={handleUpload}
                >
                  <Icon name="sparkles" className="h-4 w-4" />
                  {isBusy
                    ? phase === "uploading"
                      ? "Uploading…"
                      : "Processing…"
                    : documentId
                      ? "Retry processing"
                      : "Upload & process"}
                </button>
              )}
            </div>
          </Card>
          {result && (
            <Card className="border-emerald-200 p-6">
              <div role="status" className="flex items-start gap-3">
                <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">
                  <Icon name="check" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {result.idempotent
                      ? "Invoice already processed"
                      : "Invoice processed successfully"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your invoice is recorded. Review any exceptions before
                    proceeding.
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                {[
                  ["Invoice", result.invoice.invoiceNumber],
                  ["Purchase order", result.invoice.poNumber],
                  ["Vendor", result.invoice.vendorName ?? "Not provided"],
                  ["Quantity", result.invoice.quantity],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {result.extraction?.invoice && (
                <div className="mt-4 space-y-2 text-xs leading-5 text-slate-500">
                  <p>
                    Extraction confidence:{" "}
                    {Math.round(result.extraction.invoice.confidence * 100)}% ·{" "}
                    {result.extraction.attempts.find(
                      (attempt) => attempt.status === "SUCCEEDED"
                    )?.provider === "openai"
                      ? "AI extraction"
                      : "Fallback extraction"}
                    . Informational, not a guarantee.
                  </p>
                  {result.extraction.invoice.warnings.length > 0 && (
                    <ul className="list-disc pl-4 text-amber-800">
                      {result.extraction.invoice.warnings.map(
                        (warning, index) => (
                          <li key={index}>{warning}</li>
                        )
                      )}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/invoices" className={secondaryButton}>
                  View invoices
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <Link href="/exceptions" className={secondaryButton}>
                  Review exceptions
                </Link>
              </div>
            </Card>
          )}
        </div>
        <UploadProgress
          phase={phase}
          progress={progress}
          uploaded={!!documentId}
          insights={insights}
          extractionProvider={
            result?.extraction?.attempts.find(
              (attempt) => attempt.status === "SUCCEEDED"
            )?.provider
          }
          alreadyProcessed={result?.idempotent}
        />
      </div>
    </div>
  )
}
