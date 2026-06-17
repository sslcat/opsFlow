# OpsFlow

OpsFlow is a full-stack operations workflow platform built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

* Purchase Order Management
* Invoice Processing
* PDF Invoice Upload
* PDF Text Extraction
* Invoice Data Parsing
* Purchase Order Reconciliation
* Automated Exception Detection
* Dashboard Analytics

## Tech Stack

### Frontend

* Next.js 16
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js Route Handlers
* Prisma ORM

### Database

* Neon PostgreSQL

## Workflow

1. Purchase Orders are stored in the system.
2. Users upload invoice PDFs.
3. The system extracts invoice data.
4. Invoice data is matched against the corresponding Purchase Order.
5. Exceptions are automatically generated when mismatches are detected.
6. Users review exceptions through the dashboard.

## Current Screens

* Dashboard
* Upload Invoice
* Orders
* Invoices
* Exceptions

## Example Use Case

PO-1001 is created with:

* Quantity: 100
* Unit Price: $10

An invoice is uploaded with:

* Quantity: 100
* Unit Price: $12

OpsFlow automatically detects the price mismatch and creates an exception for review.

## Future Enhancements

* Exception Resolution Workflow
* Authentication & Authorization
* AI-Powered Invoice Extraction
* Multi-Tenant Organizations
* Analytics & Reporting
* Cloud Deployment
