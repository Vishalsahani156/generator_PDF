import { Navigate } from 'react-router-dom';

function AdminLogin() {
  return <Navigate to="/login?mode=admin" replace />;
}

export default AdminLogin;

