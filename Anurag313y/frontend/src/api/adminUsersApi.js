import adminApi from './adminAxios';

export const fetchAdminUsers = async ({ page, limit, q, status, role, sort }) => {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (role) params.set('role', role);
  if (sort) params.set('sort', sort);

  const { data } = await adminApi.get(`/admin/users?${params.toString()}`);
  return data;
};

export const setAdminUserDisabled = async ({ id, disabled }) => {
  const { data } = await adminApi.patch(`/admin/users/${id}/disabled`, { disabled });
  return data;
};

