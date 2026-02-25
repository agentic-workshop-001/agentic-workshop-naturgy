---
name: frontend-scaffold
description: Construye UI React/Vite para workshop GAS (maestros + lecturas + tarifas + factores + IVA + facturación + facturas + descarga PDF) y termina con runbook E2E.
tools:
  - read
  - search
  - edit
  - shell
---

## Goal
Crear la UI E2E para facturación de GAS y terminar con un runbook corto para levantar y demo.

## SSOT (no negociable)
Usar SOLO:
- `_data/specs/gas/csv-spec.txt`
- `_data/specs/gas/logic-spec.txt`

## What to build
- React + Vite + TypeScript en `frontend/`
- Dev proxy: `/api` → backend

### Páginas
1) Puntos de suministro (CRUD)
2) Lecturas (CRUD + filtros por cups y rango fechas)
3) Tarifario (CRUD + vigencia)
4) Factores conversión (CRUD + filtro zona/mes)
5) IVA (CRUD simple para taxes; al menos taxCode=IVA)
6) Facturación / Facturas
   - Input periodo (YYYY-MM)
   - Botón “Ejecutar facturación”
   - Listado de facturas (filtros cups/periodo)
   - Detalle (cabecera + líneas)
   - Descarga PDF

### UX mínimo
- Loading/error/success
- Validaciones básicas (requeridos, formatos YYYY-MM / fechas / decimales)

## Final output (must be produced at end)
Runbook corto:
- prerequisitos
- start backend
- start frontend
- pasos demo
- paths SSOT + CSV samples gas
