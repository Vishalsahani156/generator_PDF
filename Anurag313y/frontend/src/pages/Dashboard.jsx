import { Link } from 'react-router-dom';
import InvoiceTable from '../components/InvoiceTable';
import { useInvoicesQuery } from '../hooks/useInvoiceQueries';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useInvoicesQuery(isAuthenticated);

  const invoices = data?.data?.invoices ?? [];

  const stats = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.status === 'paid').length,
    pending: invoices.filter((inv) => inv.status === 'draft' || inv.status === 'sent').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your invoices and quick actions.
          </p>
        </div>
        <Link
          to="/invoices/create"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Create Invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Invoices', value: isLoading ? '...' : stats.total },
          { label: 'Paid', value: isLoading ? '...' : stats.paid },
          { label: 'Pending', value: isLoading ? '...' : stats.pending },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {isError && (
        <p className="text-sm text-amber-600">
          Invoices API not ready yet — list will load when backend CRUD is implemented.
        </p>
      )}

      <InvoiceTable invoices={invoices} isLoading={isLoading} />
    </div>
  );
}

export default Dashboard;
