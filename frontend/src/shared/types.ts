// Shared DTO types for backend payloads

export interface SupplyPoint {
  cups: string;
  zona: string;
  tarifa: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface GasReading {
  cups: string;
  fecha: string; // YYYY-MM-DD
  lecturaM3: number;
  tipo: 'REAL' | 'ESTIMADA';
}

export interface GasTariff {
  id?: number;
  tarifa: string;
  fijoMesEur: number;
  variableEurKwh: number;
  vigenciaDesde: string; // YYYY-MM-DD
}

export interface ConversionFactor {
  id?: number;
  zona: string;
  mes: string; // YYYY-MM
  coefConv: number;
  pcsKwhM3: number;
}

export interface TaxConfig {
  id?: number;
  taxCode: string;
  taxRate: number;
  vigenciaDesde: string; // YYYY-MM-DD
}

export interface InvoiceLine {
  id?: number;
  lineType: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface Invoice {
  id: number;
  numeroFactura: string;
  cups: string;
  periodoInicio: string;
  periodoFin: string;
  base: number;
  impuestos: number;
  total: number;
  fechaEmision: string;
  lines?: InvoiceLine[];
}

export interface BillingResult {
  period: string;
  invoicesCreated: number;
  errors: string[];
}
