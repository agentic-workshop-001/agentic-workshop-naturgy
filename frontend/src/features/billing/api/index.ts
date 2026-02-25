import { http } from '../../../shared/api/httpClient';
import type { Invoice, BillingResult } from '../../../shared/types';

export const billingApi = {
  runBilling: (period: string) =>
    http.post<BillingResult>(`/billing/run?period=${encodeURIComponent(period)}`),
  getInvoices: (cups?: string, period?: string) => {
    const params = new URLSearchParams();
    if (cups) params.set('cups', cups);
    if (period) params.set('period', period);
    const qs = params.toString();
    return http.get<Invoice[]>(`/invoices${qs ? '?' + qs : ''}`);
  },
  getInvoice: (id: number) => http.get<Invoice>(`/invoices/${id}`),
  deleteInvoice: (id: number) => http.del(`/invoices/${id}`),
  getPdfUrl: (id: number) => `/api/gas/invoices/${id}/pdf`,
};
