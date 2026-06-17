async function getInvoices() {
  const response = await fetch(
    "http://localhost:3000/api/invoices",
    {
      cache: "no-store"
    }
  )

  return response.json()
}

export default async function InvoicesPage() {
  const data = await getInvoices()

  const invoices = data.invoices || []

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Invoices
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full text-left">

          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Invoice</th>
              <th className="p-4">PO</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Unit Price</th>
            </tr>
          </thead>

          <tbody>

            {invoices.map((invoice: any) => (
              <tr
                key={invoice.id}
                className="border-b"
              >
                <td className="p-4 font-semibold">
                  {invoice.invoiceNumber}
                </td>

                <td className="p-4">
                  {invoice.poNumber}
                </td>

                <td className="p-4">
                  {invoice.vendorName}
                </td>

                <td className="p-4">
                  {invoice.quantity}
                </td>

                <td className="p-4">
                  ${invoice.unitPrice}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>
    </div>
  )
}