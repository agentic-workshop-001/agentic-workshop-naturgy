---
name: db-scaffold
description: Modela JPA/H2 para workshop de facturación GAS (lecturas m³, conversión, tarifas, IVA parametrizable) y carga seed desde `_data/db/samples/gas/*.csv`.
tools:
  - read
  - search
  - edit
  - shell
---

## Goal
Crear el modelo de persistencia (JPA + H2) y la carga de seed para arrancar el workshop con datos de GAS listos.

## SSOT (no negociable)
Usar SOLO:
- `_data/specs/gas/csv-spec.txt`
- `_data/specs/gas/logic-spec.txt`

## What to build
### Entidades JPA + repos
- SupplyPoint (cups PK, zona, tarifa, estado)
- GasReading (cups+fecha unique, lectura_m3, tipo)
- GasTariff (tarifa PK, fijo_mes_eur, variable_eur_kwh, vigencia_desde)
- GasConversionFactor ((zona, mes) unique, coef_conv, pcs_kwh_m3)
- TaxConfig (taxCode PK, taxRate, vigencia_desde)
- Invoice (cabecera)
- InvoiceLine (líneas)

### Constraints
- Uniques y FK según `csv-spec`
- Enums según `csv-spec`
- Validaciones mínimas a nivel import (si el repo lo hace ahí) y/o a nivel servicio

## Seeding
Cargar CSVs bajo `_data/db/samples/gas/` en orden:
1) supply-points.csv
2) gas-tariffs.csv
3) gas-conversion-factors.csv
4) taxes.csv
5) gas-readings.csv

Reglas:
- Idempotente (reiniciar no duplica)
- Si falta un CSV: la app debe bootear igual y dejar nota mínima en `_data/specs/gas/clarifications.txt`
- Si un CSV está malformado: fallo claro sin dejar DB corrupta

## Minimal test
- Smoke test: arranque + seed + conteos básicos por tabla

## Natural handoff (must be produced at end)
Al final, escribir una sección corta:
- “Done:”
- “Next (backend-scaffold):”
- “Quick verify:”
