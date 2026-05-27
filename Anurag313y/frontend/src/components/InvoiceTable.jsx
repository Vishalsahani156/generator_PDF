import { Link } from 'react-router-dom';

function InvoiceTable({ invoices = [], isLoading = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice #</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Client</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                Loading invoices...
              </td>
            </tr>
          ) : invoices.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                No invoices yet. Create your first invoice to get started.
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice._id || invoice.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/invoices/${invoice._id || invoice.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{invoice.clientName}</td>
                <td className="px-4 py-3 text-slate-700">
                  {typeof invoice.total === 'number' ? `$${invoice.total.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{invoice.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceTable;
