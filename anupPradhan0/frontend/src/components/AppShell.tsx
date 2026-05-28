import { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';
import { useAuth } from '../lib/auth';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      navigate('/login/auth', { replace: true });
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-blue-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="inline-block h-6 w-6 rounded-lg bg-blue-600" aria-hidden />
            <span className="text-base font-semibold">Aperture</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden text-sm text-blue-600 sm:inline">{user.email}</span>
            )}
            <button
              type="button"
              onClick={() => signOut.mutate()}
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              {signOut.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-blue-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
          <p className="text-sm text-blue-300">© 2026 Aperture, Inc.</p>
          <p className="text-sm text-blue-300">Events</p>
        </div>
      </footer>
    </div>
  );
}
