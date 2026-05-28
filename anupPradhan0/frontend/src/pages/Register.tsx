import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { register } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => register(email, password, name),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(['auth', 'me'], user);
      navigate('/', { replace: true });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed';
      setError(message);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-blue-200 bg-white p-8">
        <div className="mb-8 flex items-center gap-2 text-blue-600">
          <span className="inline-block h-6 w-6 rounded-lg bg-blue-600" aria-hidden />
          <span className="text-base font-semibold">Aperture</span>
        </div>
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-2 text-sm text-blue-600">It only takes a minute.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          {error && (
            <div
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600"
              role="alert"
            >
              {error}
            </div>
          )}
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-600">
          Already have an account?{' '}
          <Link
            to="/login/auth"
            className="font-medium text-blue-600 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
