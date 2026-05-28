import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoginSwitcher from '../components/LoginSwitcher';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getApiErrorMessage, useLoginMutation } from '../hooks/useAuthQueries';
import { useAdminLoginMutation } from '../hooks/useAdminAuthQueries';

function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = String(searchParams.get('mode') || 'user').toLowerCase();
  const mode = modeParam === 'admin' ? 'admin' : 'user';

  const { login } = useAuth();
  const { login: adminLogin } = useAdminAuth();
  const loginMutation = useLoginMutation();
  const adminLoginMutation = useAdminLoginMutation();

  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    loginMutation.reset();
    adminLoginMutation.reset();
  };

  const setMode = (nextMode) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set('mode', nextMode);
      return sp;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'admin') {
      adminLoginMutation.mutate(form, {
        onSuccess: (data) => {
          if (data.success) {
            adminLogin(data.data.token, data.data.admin);
            navigate('/admin/users');
          }
        },
      });
      return;
    }

    loginMutation.mutate(form, {
      onSuccess: (data) => {
        if (data.success) {
          login(data.data.token, data.data.user);
          navigate('/dashboard');
        }
      },
    });
  };

  const activeMutation = mode === 'admin' ? adminLoginMutation : loginMutation;
  const error = activeMutation.isError
    ? getApiErrorMessage(activeMutation.error, 'Login failed. Please try again.')
    : '';

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <LoginSwitcher mode={mode} onModeChange={setMode} />
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">
          {mode === 'admin' ? 'Admin login' : 'Login'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === 'admin' ? 'Restricted access. Admins only.' : 'Sign in to manage your invoices.'}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6">
          <div
            key={mode}
            className="animate-[fadeIn_160ms_ease-out] [@keyframes_fadeIn]:from{opacity:0;transform:translateY(4px)} [@keyframes_fadeIn]:to{opacity:1;transform:translateY(0)}"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={activeMutation.isPending}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === 'admin' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {activeMutation.isPending ? 'Signing in...' : 'Login'}
          </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
