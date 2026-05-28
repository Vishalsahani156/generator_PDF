import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (isError || !data) {
    return <Navigate to="/login/auth" replace />;
  }

  return <>{children}</>;
}
