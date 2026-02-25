---
name: backend-scaffold
description: Implementa backend Spring Boot para workshop GAS: lecturas m³ → kWh, tarifas fijo/variable, IVA parametrizable, facturas (cabecera/líneas) y PDF listo para enviar/archivo.
tools:
  - read
  - search
  - edit
  - shell
---

## Goal
Implementar la capa de aplicación/API del facturador de GAS sobre el modelo y seed creados por `db-scaffold`.

## SSOT (no negociable)
Usar SOLO:
- `_data/specs/gas/csv-spec.txt`
- `_data/specs/gas/logic-spec.txt`

## Operating rules
- No hacer preguntas ni pedir confirmaciones.
- Si falta un detalle, default determinista simple y registrarlo en `_data/specs/gas/clarifications.txt` (mínimo).
- No copiar/pegar specs en docs; solo referenciar rutas.

## What to build

### API base
- Base path: `/api/gas`
- `GET /api/gas/health`

### CRUD (mantenimientos)
Exponer CRUD para:
- Supply points
- Gas readings
- Gas tariffs
- Gas conversion factors
- Taxes (IVA parametrizable)

### Billing
Endpoint:
- `POST /api/gas/billing/run?period=YYYY-MM`

Debe:
- Procesar CUPS activos
- Resolver lecturas inicio/fin según `logic-spec`
- Calcular m³, kWh, coste fijo/variable, base, IVA, total
- Persistir factura + líneas
- Registrar errores por CUPS si faltan lecturas/tarifa/factor/IVA o si consumo negativo
- Idempotencia por (cups, period) según `logic-spec`

### Invoices + PDF
- `GET /api/gas/invoices` (filtros cups, period, fecha emision)
- `GET /api/gas/invoices/{invoiceId}` (cabecera + líneas)
- `GET /api/gas/invoices/{invoiceId}/pdf`
  - Generar con PDFBox
  - Maquetación similar a `factura_gas_demo.pdf` (estructura: datos factura, consumo, desglose, total)

### Error model
JSON consistente:
- 400 validación
- 404 no existe
- 409 opcional si aplica

### Tests
- Unit:
  - selección lecturas boundary
  - m³→kWh
  - cálculo importes + redondeos
  - IVA parametrizable
  - consumo negativo -> error
- Integration:
  - seed → run billing 2026-02 → invoices → pdf generado

## Natural handoff (must be produced at end)
Al final, escribir:
- Done
- API endpoints
- Next (frontend-scaffold)
- Quick verify (comandos + 2–3 curl)
