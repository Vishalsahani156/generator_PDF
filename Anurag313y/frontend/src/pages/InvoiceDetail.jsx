import { Link, useParams } from 'react-router-dom';
import { useInvoiceQuery } from '../hooks/useInvoiceQueries';
import { useAuth } from '../context/AuthContext';

function InvoiceDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useInvoiceQuery(id, isAuthenticated);

  const invoice = data?.data?.invoice;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoice Detail</h1>
          <p className="mt-1 text-sm text-slate-500">Invoice ID: {id}</p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading invoice...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          Invoice details API not ready yet — will load when backend CRUD is implemented.
        </div>
      )}

      {!isLoading && !isError && invoice && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-700">
          <p>
            <span className="font-medium">Number:</span> {invoice.invoiceNumber}
          </p>
          <p className="mt-2">
            <span className="font-medium">Client:</span> {invoice.clientName}
          </p>
          <p className="mt-2">
            <span className="font-medium">Status:</span> {invoice.status}
          </p>
        </div>
      )}

      {!isLoading && !isError && !invoice && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          Invoice not found.
        </div>
      )}
    </div>
  );
}

export default InvoiceDetail;
