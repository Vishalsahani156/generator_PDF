import { useMutation } from '@tanstack/react-query';
import { adminLogin } from '../api/adminAuthApi';

export const getApiErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || fallback;

export const useAdminLoginMutation = () =>
  useMutation({
    mutationFn: adminLogin,
  });

