import { Card, DataTable, EmptyState, PageHeader } from "@/components/ui"
import { getWorkspacePageContext } from "@/components/workspace-page-access"
import { WorkspaceAccessState } from "@/components/workspace-access-state"
import { getInvoicesPageData } from "@/lib/tenant-page-data"

export default async function InvoicesPage() {
  const authorization = await getWorkspacePageContext("invoice.read")

  if (!authorization) return <WorkspaceAccessState />

  const invoices = await getInvoicesPageData(authorization.organizationId)

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Your recorded invoices, ready for a closer look."
      />

      {invoices.length === 0 ? (
        <Card>
          <EmptyState
            title="No invoices yet"
            description="Upload an invoice to extract its details and compare it with a purchase order."
            href="/upload"
            action="Upload invoice"
          />
        </Card>
      ) : (
        <DataTable label="Invoices">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th scope="col" className="p-4">
                Invoice
              </th>
              <th scope="col" className="p-4">
                PO
              </th>
              <th scope="col" className="p-4">
                Vendor
              </th>
              <th scope="col" className="p-4">
                Quantity
              </th>
              <th scope="col" className="p-4">
                Unit Price
              </th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b">
                <td className="p-4 font-semibold">{invoice.invoiceNumber}</td>

                <td className="p-4">{invoice.poNumber}</td>

                <td className="p-4">{invoice.vendorName}</td>

                <td className="p-4">{invoice.quantity}</td>

                <td className="p-4">${invoice.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
