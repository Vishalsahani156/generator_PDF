import adminApi from './adminAxios';

export const adminLogin = async (payload) => {
  const { data } = await adminApi.post('/admin/auth/login', payload);
  return data;
};

