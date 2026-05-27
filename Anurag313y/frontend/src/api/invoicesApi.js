import api from './axios';

export const fetchInvoices = async () => {
  const { data } = await api.get('/invoices');
  return data;
};

export const fetchInvoiceById = async (id) => {
  const { data } = await api.get(`/invoices/${id}`);
  return data;
};
