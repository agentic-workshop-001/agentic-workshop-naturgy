import { http } from '../../../shared/api/httpClient';
import type { TaxConfig } from '../../../shared/types';

export const taxesApi = {
  getAll: () => http.get<TaxConfig[]>('/taxes'),
  create: (t: TaxConfig) => http.post<TaxConfig>('/taxes', t),
  update: (id: number, t: TaxConfig) => http.put<TaxConfig>(`/taxes/${id}`, t),
  delete: (id: number) => http.del(`/taxes/${id}`),
};
