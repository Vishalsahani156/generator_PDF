import { useQuery } from '@tanstack/react-query';
import { fetchMe, AuthUser } from './api';

export function useAuth() {
  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
