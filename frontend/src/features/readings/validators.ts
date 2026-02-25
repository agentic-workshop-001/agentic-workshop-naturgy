/**
 * Validation utilities for GasReading form
 */

import type { GasReading } from '../../shared/types';

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validates a GasReading object according to backend requirements
 */
export function validateGasReading(reading: Partial<GasReading>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate CUPS
  if (!reading.cups || typeof reading.cups !== 'string' || !reading.cups.trim()) {
    errors.cups = 'CUPS es obligatorio (no puede estar vacío)';
  }

  // Validate fecha
  if (!reading.fecha || typeof reading.fecha !== 'string' || !reading.fecha.trim()) {
    errors.fecha = 'Fecha es obligatoria';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(reading.fecha)) {
    errors.fecha = 'Fecha debe estar en formato YYYY-MM-DD (ej: 2026-02-25)';
  } else {
    // Check if date is valid
    const date = new Date(reading.fecha + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      errors.fecha = 'Fecha no es válida';
    }
  }

  // Validate lecturaM3
  if (reading.lecturaM3 === undefined || reading.lecturaM3 === null) {
    errors.lecturaM3 = 'Lectura m³ es obligatoria';
  } else if (typeof reading.lecturaM3 !== 'number' || reading.lecturaM3 < 0) {
    errors.lecturaM3 = 'Lectura m³ debe ser un número >= 0';
  }

  // Validate tipo
  if (!reading.tipo || !['REAL', 'ESTIMADA'].includes(reading.tipo)) {
    errors.tipo = 'Tipo debe ser REAL o ESTIMADA';
  }

  return errors;
}

/**
 * Validates that all required fields are present and non-empty
 */
export function isFormComplete(reading: Partial<GasReading>): boolean {
  return !!(
    reading.cups &&
    reading.fecha &&
    reading.lecturaM3 !== undefined &&
    reading.lecturaM3 !== null &&
    reading.tipo
  );
}

/**
 * Formats error message for display to user
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error desconocido';
}
