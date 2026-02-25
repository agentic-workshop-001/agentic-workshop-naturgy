import { http } from '../../../shared/api/httpClient';
import type { ConversionFactor } from '../../../shared/types';

export const conversionFactorsApi = {
  getAll: () => http.get<ConversionFactor[]>('/conversion-factors'),
  create: (cf: ConversionFactor) => http.post<ConversionFactor>('/conversion-factors', cf),
  update: (id: number, cf: ConversionFactor) =>
    http.put<ConversionFactor>(`/conversion-factors/${id}`, cf),
  delete: (id: number) => http.del(`/conversion-factors/${id}`),
};
