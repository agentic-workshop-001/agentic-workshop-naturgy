import { describe, it, expect } from 'vitest';
import { validateGasReading, isFormComplete } from './validators';

describe('GasReading Validators', () => {
  describe('validateGasReading', () => {
    it('should accept valid reading', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should reject empty CUPS', () => {
      const reading = {
        cups: '',
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.cups).toBeDefined();
      expect(errors.cups).toContain('CUPS');
    });

    it('should reject missing CUPS', () => {
      const reading = {
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.cups).toBeDefined();
    });

    it('should reject empty fecha', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.fecha).toBeDefined();
      expect(errors.fecha).toContain('Fecha');
    });

    it('should reject invalid fecha format', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '25/02/2026', // wrong format
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.fecha).toBeDefined();
      expect(errors.fecha).toContain('YYYY-MM-DD');
    });

    it('should reject negative lecturaM3', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '2026-02-25',
        lecturaM3: -5,
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.lecturaM3).toBeDefined();
      expect(errors.lecturaM3).toContain('>= 0');
    });

    it('should reject invalid tipo', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '2026-02-25',
        lecturaM3: 100,
        tipo: 'INVALIDO' as unknown as 'REAL' | 'ESTIMADA',
      };
      const errors = validateGasReading(reading);
      expect(errors.tipo).toBeDefined();
      expect(errors.tipo).toContain('REAL');
    });

    it('should reject missing lecturaM3', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '2026-02-25',
        tipo: 'REAL' as const,
      };
      const errors = validateGasReading(reading);
      expect(errors.lecturaM3).toBeDefined();
    });
  });

  describe('isFormComplete', () => {
    it('should return true for complete form', () => {
      const reading = {
        cups: 'ES0021000000001AA',
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      expect(isFormComplete(reading)).toBe(true);
    });

    it('should return false for missing cups', () => {
      const reading = {
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      expect(isFormComplete(reading)).toBe(false);
    });

    it('should return false for empty cups', () => {
      const reading = {
        cups: '',
        fecha: '2026-02-25',
        lecturaM3: 100.5,
        tipo: 'REAL' as const,
      };
      expect(isFormComplete(reading)).toBe(false);
    });
  });
});
