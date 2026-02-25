import { http } from '../../../shared/api/httpClient';
import type { GasTariff } from '../../../shared/types';

export const tariffsApi = {
  getAll: () => http.get<GasTariff[]>('/tariffs'),
  create: (t: GasTariff) => http.post<GasTariff>('/tariffs', t),
  update: (id: number, t: GasTariff) => http.put<GasTariff>(`/tariffs/${id}`, t),
  delete: (id: number) => http.del(`/tariffs/${id}`),
};
