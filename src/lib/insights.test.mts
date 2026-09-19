import assert from "node:assert/strict"
import { mock, test } from "node:test"
import type { InsightsInput } from "./insights/types.ts"

mock.module("server-only", { namedExports: {} })
const { generateInvoiceInsights } = await import("./insights/service.ts")
const { createOpenAIInsightsProvider } = await import("./insights/openai-provider.ts")
mock.restoreAll()

const input: InsightsInput = {
  invoice: {
    invoiceNumber: "INV-1", purchaseOrderNumber: "PO-1", vendorName: "Acme",
    invoiceDate: null, currency: null, subtotal: null, tax: null, total: null,
    lineItems: [{ itemCode: null, description: null, quantity: 10, unitPrice: 5, total: 50 }],
    confidence: 0.8, warnings: ["Currency not supplied"],
  },
  purchaseOrder: { poNumber: "PO-1", quantity: 10, unitPrice: 5 },
  matching: { status: "MATCHED", checks: ["purchaseOrderExists", "quantity", "unitPrice"], exceptions: [] },
  validation: { status: "PASSED", errors: [], warnings: ["Currency not supplied"] },
}
const insights = { summary: "Quantity and price match.", observations: ["Currency was not checked."], recommendations: ["Review the invoice before continuing."], confidence: 0.8 }
const response = (value: unknown) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] })

test("insights validates provider output and isolates the processing snapshot", async () => {
  const original = structuredClone(input)
  const result = await generateInvoiceInsights(input, {
    name: "test", model: "test-model", generate: async (snapshot) => {
      assert.deepEqual(snapshot, input)
      snapshot.invoice.lineItems[0].quantity = 999
      return insights
    },
  })
  assert.deepEqual(result, { status: "AVAILABLE", provider: "test", model: "test-model", insights })
  assert.deepEqual(input, original)
})

test("missing provider, errors, and invalid advisory output return unavailable without leaking errors", async () => {
  assert.deepEqual(await generateInvoiceInsights(input, null), { status: "UNAVAILABLE", insights: null })
  for (const output of [null, {}, { ...insights, confidence: 2 }, { ...insights, confidence: NaN },
    { ...insights, summary: " " }, { ...insights, summary: "a".repeat(2001) },
    { ...insights, observations: [42] }, { ...insights, recommendations: Array(11).fill("review") },
    { ...insights, approved: true }]) {
    assert.deepEqual(await generateInvoiceInsights(input, { name: "test", model: "test", generate: async () => output }), { status: "UNAVAILABLE", insights: null })
  }
  assert.deepEqual(await generateInvoiceInsights(input, { name: "test", model: "test", generate: async () => { throw new Error("private provider error") } }), { status: "UNAVAILABLE", insights: null })
})

test("OpenAI insights sends structured facts, strict output schema, no storage, and a deadline", async () => {
  const provider = createOpenAIInsightsProvider({ apiKey: "test", model: "test-model", fetch: async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses")
    const body = JSON.parse(options?.body as string)
    assert.deepEqual(JSON.parse(body.input), input)
    assert.equal(body.store, false)
    assert.equal(body.model, "test-model")
    assert.equal(body.text.format.strict, true)
    assert.equal(body.text.format.schema.additionalProperties, false)
    assert.equal(body.tools, undefined)
    assert.ok(options?.signal)
    return response(insights)
  } })
  assert.equal((await generateInvoiceInsights(input, provider)).status, "AVAILABLE")
})

test("refusal, partial responses, invalid JSON, HTTP failures, and timeout do not retry or fail processing", async () => {
  for (const reply of [
    async () => new Response(null, { status: 429 }),
    async () => new Response(null, { status: 500 }),
    async () => Response.json({ status: "incomplete", output: [] }),
    async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] }),
    async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "bad JSON" }] }] }),
    async () => Response.json({ status: "completed", output: [null] }),
    async () => { throw new DOMException("Timed out", "TimeoutError") },
  ]) {
    let calls = 0
    const provider = createOpenAIInsightsProvider({ apiKey: "test", model: "test", fetch: async () => { calls++; return reply() } })
    assert.deepEqual(await generateInvoiceInsights(input, provider), { status: "UNAVAILABLE", insights: null })
    assert.equal(calls, 1)
  }
})
