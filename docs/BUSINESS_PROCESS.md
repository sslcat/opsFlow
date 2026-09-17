# Business Process

## Procure-to-Pay (P2P)

OpsFlow supports part of the Procure-to-Pay business process.

Current workflow:

Purchase Order

↓

Vendor ships goods

↓

Invoice received

↓

Invoice compared with Purchase Order

↓

Exceptions detected

↓

Exception resolved

↓

Invoice approved for payment

---

# Purchase Order (PO)

A Purchase Order is a request created by the buyer.

Example:

PO-1001

Vendor:
Acme Supplies

Item:
Industrial Component

Quantity:
100

Price:
$10

The Purchase Order represents the agreed purchasing terms.

---

# Vendor Invoice

After shipping goods, the vendor sends an invoice.

Example:

INV-9002

PO:
PO-1001

Quantity:
100

Price:
$12

OpsFlow extracts the invoice data automatically.

---

# Purchase Order Matching

OpsFlow matches the uploaded invoice against the corresponding Purchase Order.

Current matching compares:

- PO Number
- Vendor
- Quantity
- Unit Price

---

# Exception Detection

When differences are detected, OpsFlow creates exceptions.

Current exception types include:

- PRICE_MISMATCH
- QUANTITY_MISMATCH
- MISSING_DOCUMENT
- DUPLICATE_INVOICE

Example:

Purchase Order:

100 units

$10

Invoice:

100 units

$12

↓

PRICE_MISMATCH

---

# Exception Resolution

Finance users review exceptions.

Exceptions can be:

OPEN

↓

RESOLVED

Future versions will include:

IN REVIEW

APPROVED

REJECTED

---

# Future Business Process

OpsFlow will evolve into full 3-Way Matching.

Purchase Order

↓

Goods Receipt

↓

Invoice

↓

Comparison

↓

Approval Workflow

Goods Receipt verifies that physical goods were actually received before payment approval.

Example:

PO:
100 units

Goods Receipt:
80 units

Invoice:
100 units

↓

Exception

Invoice quantity exceeds received quantity.

---

# Long-Term Vision

OpsFlow aims to automate Accounts Payable document processing using AI.

Future capabilities include:

- AI document extraction
- Goods Receipt processing
- 3-Way Matching
- Vendor analytics
- Fraud detection
- Approval workflows
- Audit timeline