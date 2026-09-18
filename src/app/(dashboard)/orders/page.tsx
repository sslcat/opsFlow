import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export default async function OrdersPage() {
  await auth.protect()

  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Purchase Orders
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">PO Number</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Item</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Unit Price</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="p-4 font-semibold">
                  {order.poNumber}
                </td>

                <td className="p-4">
                  {order.vendorName}
                </td>

                <td className="p-4">
                  {order.itemCode}
                </td>

                <td className="p-4">
                  {order.quantity}
                </td>

                <td className="p-4">
                  ${order.unitPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
