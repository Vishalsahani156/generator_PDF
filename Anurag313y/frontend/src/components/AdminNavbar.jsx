import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-white/85 hover:bg-white/10 hover:text-white'
  }`;

function AdminNavbar() {
  const { isAdminAuthenticated, logout } = useAdminAuth();
  const location = useLocation();
  const isLogin = location.pathname === '/admin/login';

  return (
    <header className="border-b border-indigo-700 bg-gradient-to-r from-indigo-700 to-purple-700">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/users" className="text-lg font-semibold text-white">
            Admin Panel
          </Link>
          <span className="hidden rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs font-medium text-white/80 sm:inline-flex">
            Restricted
          </span>
        </div>

        <nav className="flex items-center gap-2">
          {!isLogin && (
            <NavLink to="/admin/users" className={navLinkClass}>
              Users
            </NavLink>
          )}

          {isAdminAuthenticated && (
            <button
              type="button"
              onClick={logout}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default AdminNavbar;

