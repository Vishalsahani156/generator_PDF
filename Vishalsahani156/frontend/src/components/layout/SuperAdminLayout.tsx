import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Button } from '../common/Button';
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext';

export const SuperAdminLayout = ({ children }: { children: ReactNode }) => {
  const { admin, logout } = useSuperAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-600">Super Admin</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {admin ? `Signed in as ${admin.username}` : 'Administration'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/super-admin/dashboard">
              <Button variant="outline" className="text-xs">
                Users
              </Button>
            </Link>
            <Button variant="secondary" className="text-xs" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
};
