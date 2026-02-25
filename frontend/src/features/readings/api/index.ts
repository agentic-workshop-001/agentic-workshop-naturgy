import { http } from '../../../shared/api/httpClient';
import type { GasReading } from '../../../shared/types';

export const readingsApi = {
  getAll: (cups?: string) =>
    http.get<GasReading[]>(cups ? `/readings?cups=${encodeURIComponent(cups)}` : '/readings'),
  create: (r: GasReading) => http.post<GasReading>('/readings', r),
  delete: (cups: string, fecha: string) =>
    http.del(`/readings/${encodeURIComponent(cups)}/${fecha}`),
};
