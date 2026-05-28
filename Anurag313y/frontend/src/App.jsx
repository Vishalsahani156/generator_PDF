import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import Navbar from './components/Navbar';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ProtectedRoute from './components/ProtectedRoute';
import CreateInvoice from './pages/CreateInvoice';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminUsers from './pages/admin/AdminUsers';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-full">
      {isAdminRoute ? <AdminNavbar /> : <Navbar />}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login?mode=admin" replace />} />
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <AdminUsers />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/add"
            element={
              <ProtectedRoute>
                <CreateInvoice />
              </ProtectedRoute>
            }
          />
          {/* Legacy redirects */}
          <Route path="/invoices/create" element={<Navigate to="/events/add" replace />} />
          <Route path="/invoices/:id" element={<Navigate to="/dashboard" replace />} />
          {/* Keep admin and user panels separated */}
          <Route path="/admin/*" element={<Navigate to="/admin/users" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
