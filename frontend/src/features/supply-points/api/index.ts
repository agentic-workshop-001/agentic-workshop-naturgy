import { http } from '../../../shared/api/httpClient';
import type { SupplyPoint } from '../../../shared/types';

export const supplyPointsApi = {
  getAll: () => http.get<SupplyPoint[]>('/supply-points'),
  create: (sp: SupplyPoint) => http.post<SupplyPoint>('/supply-points', sp),
  update: (cups: string, sp: SupplyPoint) =>
    http.put<SupplyPoint>(`/supply-points/${encodeURIComponent(cups)}`, sp),
  delete: (cups: string) =>
    http.del(`/supply-points/${encodeURIComponent(cups)}`),
};
