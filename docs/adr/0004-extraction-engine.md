# ADR-0004: AI Extraction Engine

## Status

Accepted

## Date

2026-09-19

---

# Context

OpsFlow currently extracts invoice fields using deterministic regular expressions.

While this approach works for the sample invoices used during development, it does not scale to multiple vendors because invoice layouts differ significantly.

The product vision is to support invoices from arbitrary vendors while maintaining deterministic and auditable business processing.

---

# Decision

OpsFlow will introduce an Extraction Engine.

The Extraction Engine becomes the single interface responsible for converting uploaded invoice documents into a normalized invoice model.

The remainder of the application must never depend directly on a specific AI provider or parsing implementation.

---

# Architecture

```
PDF

↓

Extraction Engine

↓

Extraction Provider

↓

OpenAI Provider
Regex Provider

↓

Normalized Invoice

↓

Existing Matching Engine
```

---

# Provider Model

Extraction providers implement a common interface.

Each provider receives:

- uploaded document
- extracted PDF text
- metadata

Each provider returns:

- normalized invoice
- confidence score
- extraction metadata
- validation warnings

---

# Initial Providers

## OpenAI Provider

Primary extraction provider.

Responsibilities:

- Understand arbitrary invoice layouts.
- Return structured invoice fields.
- Produce confidence information.

---

## Regex Provider

Fallback provider.

Responsibilities:

- Preserve compatibility with existing deterministic parsing.
- Operate when AI is unavailable.
- Provide predictable extraction for known layouts.

---

# Normalized Invoice Model

Providers must return a common structure.

Fields include:

- invoiceNumber
- purchaseOrderNumber
- vendorName
- invoiceDate
- currency
- line items
- subtotal
- tax
- total
- confidence
- warnings

Business logic must never depend on provider-specific output.

---

# Validation

Extraction is not considered trusted.

After extraction:

1. Validate required fields.
2. Validate data types.
3. Validate business rules.
4. Continue existing invoice matching.

AI never bypasses business validation.

---

# Failure Strategy

If OpenAI fails:

↓

Retry if appropriate.

↓

Fallback to Regex Provider.

↓

If extraction still fails:

Create extraction failure state.

Do not create invoices automatically.

---

# Auditability

Every extraction should record:

- provider
- model
- timestamp
- confidence
- document ID

Future releases may also record prompt version and schema version.

---

# Future Providers

The architecture intentionally supports additional providers.

Potential future providers:

- Azure Document Intelligence
- Google Document AI
- AWS Textract

No application code outside the Extraction Engine should require modification when adding a provider.

---

# Consequences

Positive

- Provider-independent architecture
- Easier testing
- Easier replacement of AI vendors
- Deterministic fallback
- Better maintainability

Negative

- Additional abstraction layer
- More implementation effort

---

# Future Work

Sprint 4B

Implement Extraction Engine.

Sprint 4C

Implement OpenAI Provider.

Sprint 4D

Replace current regex entry point with Extraction Engine while preserving regex fallback.