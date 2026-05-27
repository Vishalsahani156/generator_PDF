import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loginUser, registerUser, fetchCurrentUser } from '../api/authApi';
import { queryKeys } from '../constants/queryKeys';

export const getApiErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || fallback;

export const useRegisterMutation = () =>
  useMutation({
    mutationFn: registerUser,
  });

export const useLoginMutation = () =>
  useMutation({
    mutationFn: loginUser,
  });

export const useCurrentUserQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchCurrentUser,
    enabled,
    retry: false,
  });

export const useInvalidateAuth = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
};
