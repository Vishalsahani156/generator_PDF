import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-blue-300">Loading…</p>
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/login/auth" replace />;
  }

  return <>{children}</>;
}
