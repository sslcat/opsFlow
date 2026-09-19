# ADR-0005: AI Insights Service

## Status

Accepted

## Date

2026-09-19

---

# Context

OpsFlow currently performs deterministic invoice extraction and matching.

The application identifies mismatches but does not explain them.

Users still need to interpret business data manually.

---

# Decision

Introduce an AI Insights Service.

The service is responsible for generating human-readable explanations of invoice processing results.

The AI Insights Service is separate from the Extraction Engine.

Extraction converts documents into structured invoice data.

AI Insights explains what that structured data means.

---

# Responsibilities

The AI Insights Service may generate:

- Invoice summaries
- Mismatch explanations
- Suggested next actions
- Confidence explanations
- Business observations

The service never modifies business data.

It produces advisory information only.

---

# Inputs

The service receives:

- Normalized Invoice
- Purchase Order
- Matching Result
- Validation Result

---

# Outputs

The service returns:

- Summary
- Observations
- Recommendations
- Confidence

---

# Principles

AI is advisory.

Business rules remain deterministic.

AI never approves invoices.

AI never modifies financial data.

AI never bypasses validation.

---

# Examples

Invoice matches Purchase Order.

↓

"Invoice quantities and totals appear consistent with the Purchase Order."

---

Invoice quantity differs.

↓

"Invoice quantity differs from the Purchase Order. Review whether this is a partial shipment or an invoicing error."

---

Invoice total exceeds Purchase Order.

↓

"The invoice total exceeds the Purchase Order total. Verify taxes, freight charges, or pricing updates."

---

# Future

Future versions may generate:

- Vendor summaries
- Approval recommendations
- Exception summaries
- Email drafts
- Finance assistant conversations

The AI Insights Service remains provider-independent.