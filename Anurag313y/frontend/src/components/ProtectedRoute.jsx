import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingUser } = useAuth();
  const { isAdminAuthenticated } = useAdminAuth();

  if (isLoadingUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/users" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
