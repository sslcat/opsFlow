import assert from "node:assert/strict"
import { mock, test } from "node:test"
import type { ExtractionInput, ExtractionProvider, NormalizedInvoice } from "./extraction/types.ts"

mock.module("server-only", { namedExports: {} })
const { extractInvoice } = await import("./extraction/engine.ts")
const { regexProvider } = await import("./extraction/regex-provider.ts")
const { createOpenAIProvider } = await import("./extraction/openai-provider.ts")
const { isNormalizedInvoice } = await import("./extraction/validation.ts")
mock.restoreAll()

const input: ExtractionInput = {
  document: null,
  text: "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Acme Bill To: Buyer ITEM-1 Widget 10 $5.00 $50.00",
  metadata: { documentId: "document-1", fileName: "invoice.pdf" },
}
const invoice: NormalizedInvoice = {
  invoiceNumber: "INV-1", purchaseOrderNumber: "PO-1", vendorName: "Acme",
  invoiceDate: "2026-09-19", currency: "USD",
  lineItems: [{ itemCode: "ITEM-1", description: "Widget", quantity: 10, unitPrice: 5, total: 50 }],
  subtotal: 50, tax: 5, total: 55, confidence: 0.9, warnings: [],
}
const provider = (value: unknown): ExtractionProvider => ({ name: "test", model: "model", extract: async () => value })
const response = (value: unknown) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] })

test("engine validates primary output and records provenance", async () => {
  const result = await extractInvoice(input, [provider(invoice), regexProvider])
  assert.deepEqual(result.invoice, invoice)
  assert.deepEqual(result.errors, [])
  assert.equal(result.documentId, "document-1")
  assert.equal(result.attempts.length, 1)
  assert.equal(result.attempts[0].confidence, 0.9)
  assert.equal(result.attempts[0].model, "model")
})

test("provider errors and invalid fields fall back to deterministic extraction", async () => {
  for (const primary of [provider({ ...invoice, invoiceNumber: "" }), {
    name: "offline", model: null, extract: async () => { throw new Error("secret provider payload") },
  }]) {
    const result = await extractInvoice(input, [primary, regexProvider])
    assert.equal(result.invoice?.invoiceNumber, "INV-1")
    assert.equal(result.attempts[0].status, "FAILED")
    assert.equal(result.attempts[1].provider, "regex")
    assert.deepEqual(result.errors, [])
    assert.doesNotMatch(JSON.stringify(result), /secret provider payload/)
  }
})

test("all providers failing returns no invoice", async () => {
  const result = await extractInvoice({ ...input, text: "unrecognized invoice" }, [provider(null), regexProvider])
  assert.equal(result.invoice, null)
  assert.ok(result.errors.length)
})

test("business failures cannot be bypassed by regex fallback", async () => {
  for (const invalid of [
    { ...invoice, lineItems: [...invoice.lineItems, ...invoice.lineItems] },
    { ...invoice, total: 999 },
    { ...invoice, lineItems: [{ ...invoice.lineItems[0], quantity: -1 }] },
    { ...invoice, lineItems: [{ ...invoice.lineItems[0], quantity: 1.5 }] },
  ]) {
    const result = await extractInvoice(input, [provider(invalid), regexProvider])
    assert.ok(result.errors.length)
    assert.equal(result.attempts.length, 1)
  }
})

test("regex preserves legacy format and rejects multiple known-layout lines", async () => {
  const legacy = await extractInvoice({ ...input, text: "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Acme Quantity: 10 Unit Price: $5" }, [regexProvider])
  assert.equal(legacy.invoice?.lineItems[0].quantity, 10)
  assert.deepEqual(legacy.errors, [])
  const multi = await extractInvoice({ ...input, text: input.text + " ITEM-2 Other 2 $5 $10" }, [regexProvider])
  assert.match(multi.errors.join(), /Multiple/)
  const partial = await extractInvoice({ ...input, text: input.text + " ITEM-2 Other invalid quantity" }, [regexProvider])
  assert.equal(partial.invoice, null)
  assert.ok(partial.errors.length)
})

test("regex parses complete numeric tokens in both supported layouts", async () => {
  const header = "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Acme Bill To: Buyer "
  for (const suffix of ["Quantity: 1,000 Unit Price: $5", "ITEM-1 Widget 1,000 $5 $5,000"]) {
    const result = await extractInvoice({ ...input, text: header + suffix }, [regexProvider])
    assert.deepEqual(result.errors, [])
    assert.equal(result.invoice?.lineItems[0].quantity, 1000)
  }
  for (const quantity of ["1.5", "1,00", "1foo", "1e3", "-1", "0", "2147483648"]) {
    for (const suffix of [`Quantity: ${quantity} Unit Price: $5`, `ITEM-1 Widget ${quantity} $5 $5`]) {
      const result = await extractInvoice({ ...input, text: header + suffix }, [regexProvider])
      assert.ok(result.errors.length, suffix)
      assert.equal(result.attempts[0].status, "FAILED")
    }
  }
  for (const price of ["5foo", "5,00", "5.00.1"]) {
    const result = await extractInvoice({ ...input, text: header + `Quantity: 10 Unit Price: $${price}` }, [regexProvider])
    assert.ok(result.errors.length, price)
  }
})

test("regex rejects repeated, incomplete, and mixed labelled lines", async () => {
  const header = "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Acme Bill To: Buyer "
  for (const suffix of [
    "Quantity: 10 Unit Price: $5 Quantity: 20 Unit Price: $7",
    "Quantity: 10 Unit Price: $5 Quantity:",
    "Quantity: 10 Unit Price: $5 Unit Price: $7",
    "Quantity: 10", "Unit Price: $5",
    "ITEM-1 Widget 10 $5 $50 Quantity: 20 Unit Price: $7",
  ]) {
    const result = await extractInvoice({ ...input, text: header + suffix }, [regexProvider])
    assert.ok(result.errors.length, suffix)
    assert.equal(result.invoice, null)
  }
})

test("totals reconcile when tax or subtotal is absent without guessing tax", async () => {
  for (const subtotal of [50, null]) {
    for (const total of [1, 55]) {
      const result = await extractInvoice(input, [provider({ ...invoice, subtotal, tax: null, total }), regexProvider])
      assert.match(result.errors.join(), /Invoice total/)
      assert.equal(result.attempts.length, 1)
      assert.equal(result.attempts[0].status, "FAILED")
    }
    for (const amounts of [{ tax: null, total: 50 }, { tax: 0, total: 50 }, { tax: 5, total: 55 }, { tax: null, total: null }]) {
      const result = await extractInvoice(input, [provider({ ...invoice, subtotal, ...amounts })])
      assert.deepEqual(result.errors, [])
      assert.equal(result.invoice?.tax, amounts.tax)
    }
  }
})

test("runtime validation rejects impossible dates, nonfinite numbers, and invalid confidence", () => {
  for (const changes of [{ invoiceDate: "2026-02-30" }, { confidence: 2 }, { total: Infinity }, { currency: "dollars" }, { tax: "5" }, { unexpected: "provider-specific data" }]) {
    assert.equal(isNormalizedInvoice({ ...invoice, ...changes }), false)
  }
})

test("blank and oversized text never calls providers", async () => {
  for (const text of ["", "a".repeat(100001)]) {
    const result = await extractInvoice({ ...input, text }, [{ ...provider(invoice), extract: async () => { assert.fail("must not call provider") } }])
    assert.equal(result.invoice, null)
    assert.ok(result.errors.length)
  }
})

test("OpenAI sends strict schema, disables storage, and retries transient failures", async () => {
  let calls = 0
  const primary = createOpenAIProvider({ apiKey: "test-key", model: "test-model", fetch: async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses")
    const body = JSON.parse(options?.body as string)
    assert.equal(body.store, false)
    assert.equal(body.text.format.strict, true)
    assert.equal(body.text.format.type, "json_schema")
    assert.equal(body.input, input.text)
    assert.ok(options?.signal)
    return ++calls === 1 ? new Response(null, { status: 429 }) : response(invoice)
  } })
  assert.deepEqual(await primary.extract(input), invoice)
  assert.equal(calls, 2)
})

test("OpenAI refusal, incomplete output, malformed JSON, and authentication failure use fallback", async () => {
  for (const makeResponse of [
    () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] }),
    () => Response.json({ status: "incomplete", output: [] }),
    () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "invalid json" }] }] }),
    () => new Response(null, { status: 401 }),
  ]) {
    let calls = 0
    const primary = createOpenAIProvider({ apiKey: "test", model: "test", fetch: async () => { calls++; return makeResponse() } })
    const result = await extractInvoice(input, [primary, regexProvider])
    assert.equal(result.attempts[1].status, "SUCCEEDED")
    assert.equal(calls, 1)
  }
})

test("OpenAI network failure has a bounded retry count", async () => {
  let calls = 0
  const primary = createOpenAIProvider({ apiKey: "test", model: "test", fetch: async () => { calls++; throw new Error("timeout") } })
  await assert.rejects(primary.extract(input))
  assert.equal(calls, 2)
})
