import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminUsers, setAdminUserDisabled } from '../api/adminUsersApi';
import { queryKeys } from '../constants/queryKeys';

export const useAdminUsersQuery = (params, enabled = true) =>
  useQuery({
    queryKey: queryKeys.admin.users.list(params),
    queryFn: () => fetchAdminUsers(params),
    enabled,
    keepPreviousData: true,
  });

export const useSetAdminUserDisabledMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setAdminUserDisabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    },
  });
};

