"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Icon, primaryButton, secondaryButton } from "@/components/ui"

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-50"

export function CreatePurchaseOrder({
  existingPoNumbers,
}: {
  existingPoNumbers: string[]
}) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const errorMessage = useRef<HTMLParagraphElement>(null)
  const submitting = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string } | null>(null)
  const [created, setCreated] = useState("")

  useEffect(() => {
    // Each failure has its own identity, including repeated identical errors.
    // Effects run after the alert has committed and its ref is available.
    if (error) errorMessage.current?.focus()
  }, [error])

  useEffect(() => {
    const element = dialog.current
    const preventPendingClose = (event: Event) => {
      if (submitting.current) event.preventDefault()
    }
    // Cancel is a native, non-bubbling event; stop it at the dialog itself.
    element?.addEventListener("cancel", preventPendingClose)
    return () => element?.removeEventListener("cancel", preventPendingClose)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = event.currentTarget
    const values = new FormData(form)
    const poNumber = String(values.get("poNumber")).trim()
    const numberInput = form.elements.namedItem("poNumber") as HTMLInputElement
    if (existingPoNumbers.includes(poNumber)) {
      numberInput.setCustomValidity(
        "This PO number already exists in your organization. Use a unique number."
      )
      numberInput.reportValidity()
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber,
          vendorName: String(values.get("vendorName")).trim() || null,
          itemCode: String(values.get("itemCode")).trim() || null,
          quantity: Number(values.get("quantity")),
          unitPrice: Number(values.get("unitPrice")),
          expectedDate: values.get("expectedDate") || null,
        }),
      })
      if (!response.ok) {
        const message =
          response.status === 401
            ? "Your session has expired. Sign in again before creating a purchase order."
            : response.status === 403
              ? "You no longer have permission to create purchase orders in this organization. Contact your administrator."
              : response.status === 400
                ? "Check the PO number, quantity, unit price, and expected date, then try again."
                : "We couldn't confirm that the purchase order was saved. Check the purchase orders list for this PO number before trying again."
        setError({ message })
        return
      }
      const result = await response.json().catch(() => null)
      if (
        typeof result?.order?.id !== "string" ||
        result.order.poNumber !== poNumber
      ) {
        setError({
          message: "We couldn't confirm that the purchase order was saved. Check the purchase orders list for this PO number before trying again.",
        })
        return
      }
      setCreated(poNumber)
      dialog.current?.close()
      form.reset()
      router.refresh()
    } catch {
      setError({
        message: "Connection interrupted. Check the purchase orders list for this PO number before trying again.",
      })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div className="max-w-md">
      <button
        type="button"
        className={primaryButton}
        onClick={() => {
          setCreated("")
          setError(null)
          dialog.current?.showModal()
        }}
      >
        <Icon name="orders" className="h-4 w-4" />
        Create purchase order
      </button>
      <p role="status" className="mt-2 text-sm text-emerald-700">
        {created &&
          `Purchase order ${created} created. Ready for invoice matching.`}
      </p>
      <dialog
        ref={dialog}
        aria-labelledby="create-po-title"
        aria-describedby="create-po-description"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
      >
        <div className="border-b border-slate-100 p-6">
          <p className="mb-2 text-xs font-semibold tracking-widest text-indigo-600">
            PURCHASING TERMS
          </p>
          <h2
            id="create-po-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Create purchase order
          </h2>
          <p
            id="create-po-description"
            className="mt-2 text-sm leading-6 text-slate-500"
          >
            Add the agreed terms for one item. OpsFlow compares invoice
            quantities and unit prices against this purchase order.
          </p>
        </div>
        <form onSubmit={submit} aria-busy={pending} className="p-6">
          <fieldset disabled={pending} className="space-y-5">
            <legend className="sr-only">Purchase order details</legend>
            <p className="text-xs text-slate-500">
              All fields are required unless marked optional.
            </p>
            <label className="block text-sm font-medium" htmlFor="po-number">
              PO number
              <input
                autoFocus
                id="po-number"
                name="poNumber"
                required
                pattern=".*\S.*"
                title="Enter a PO number, not just spaces."
                aria-describedby="po-number-help"
                className={inputClass}
                placeholder="PO-1001"
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <p
              id="po-number-help"
              className="-mt-3 text-xs leading-5 text-slate-500"
            >
              Use a unique number in this organization and the same reference on
              the invoice.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="po-vendor">
                Vendor{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  id="po-vendor"
                  name="vendorName"
                  className={inputClass}
                  placeholder="Acme Supplies"
                />
              </label>
              <label className="block text-sm font-medium" htmlFor="po-item">
                Item code{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  id="po-item"
                  name="itemCode"
                  className={inputClass}
                  placeholder="ITEM-ABC"
                />
              </label>
              <label
                className="block text-sm font-medium"
                htmlFor="po-quantity"
              >
                Quantity
                <input
                  id="po-quantity"
                  name="quantity"
                  type="number"
                  required
                  min="1"
                  max="2147483647"
                  step="1"
                  className={inputClass}
                  placeholder="100"
                />
              </label>
              <label className="block text-sm font-medium" htmlFor="po-price">
                Unit price
                <input
                  id="po-price"
                  name="unitPrice"
                  type="number"
                  required
                  min="0"
                  step="any"
                  className={inputClass}
                  placeholder="10.00"
                />
              </label>
            </div>
            <label className="block text-sm font-medium" htmlFor="po-date">
              Expected date{" "}
              <span className="font-normal text-slate-500">(optional)</span>
              <input
                id="po-date"
                name="expectedDate"
                type="date"
                className={inputClass}
              />
            </label>
          </fieldset>
          {error && (
            <div>
              <p
                ref={errorMessage}
                role="alert"
                tabIndex={-1}
                className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800"
              >
                {error.message}
              </p>
              <button
                type="button"
                className={`${secondaryButton} mt-3`}
                onClick={() => {
                  dialog.current?.close()
                  router.refresh()
                }}
              >
                Check purchase orders
              </button>
            </div>
          )}
          <p role="status" className="mt-4 text-sm text-slate-500">
            {pending && "Saving purchase order…"}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={pending}
              className={secondaryButton}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Creating…" : "Create purchase order"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
