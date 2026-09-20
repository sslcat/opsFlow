import { Card, DataTable, EmptyState, PageHeader } from "@/components/ui"
import { getWorkspacePageContext } from "@/components/workspace-page-access"
import { WorkspaceAccessState } from "@/components/workspace-access-state"
import { getOrdersPageData } from "@/lib/tenant-page-data"
import { CreatePurchaseOrder } from "@/components/create-purchase-order"

export default async function OrdersPage() {
  const authorization = await getWorkspacePageContext("order.read")

  if (!authorization) return <WorkspaceAccessState />

  const orders = await getOrdersPageData(authorization.organizationId)

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="The purchasing terms behind every invoice comparison."
        action={
          authorization.permissions.has("order.create") && (
            <CreatePurchaseOrder
              key={`${authorization.organizationId}:${authorization.membershipId}`}
              existingPoNumbers={orders.map((order) => order.poNumber)}
            />
          )
        }
      />

      {orders.length === 0 ? (
        <Card>
          <EmptyState
            title="No purchase orders yet"
            description={
              authorization.permissions.has("order.create")
                ? "Create your first purchase order to give invoice matching the agreed quantity and unit price."
                : "Purchase orders will appear here once they are added to your organization."
            }
          />
        </Card>
      ) : (
        <DataTable label="Purchase orders">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th scope="col" className="p-4">
                PO Number
              </th>
              <th scope="col" className="p-4">
                Vendor
              </th>
              <th scope="col" className="p-4">
                Item
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
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="p-4 font-semibold">{order.poNumber}</td>

                <td className="p-4">{order.vendorName}</td>

                <td className="p-4">{order.itemCode}</td>

                <td className="p-4">{order.quantity}</td>

                <td className="p-4">${order.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
