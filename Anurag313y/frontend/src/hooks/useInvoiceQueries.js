import { useQuery } from '@tanstack/react-query';
import { fetchInvoiceById, fetchInvoices } from '../api/invoicesApi';
import { queryKeys } from '../constants/queryKeys';

export const useInvoicesQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.invoices.list,
    queryFn: fetchInvoices,
    enabled,
    retry: false,
  });

export const useInvoiceQuery = (id, enabled = true) =>
  useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => fetchInvoiceById(id),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
