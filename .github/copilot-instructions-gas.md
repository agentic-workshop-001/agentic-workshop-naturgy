# Copilot Instructions — Workshop GAS (SSOT strict)

## SSOT
Usar ONLY:
- `_data/specs/gas/csv-spec.txt`
- `_data/specs/gas/logic-spec.txt`

## Seed data
Cargar CSVs (según existan) bajo:
- `_data/db/samples/gas/`

## No questions / no confirmations
Los agentes no deben hacer preguntas.
Si falta un detalle, elegir default determinista simple y registrar nota mínima en:
- `_data/specs/gas/clarifications.txt`

## Outcome (E2E)
- Backend Spring Boot (Java, Maven, H2, JPA):
  - Modelo/constraints desde csv-spec
  - Billing desde logic-spec (m³ → kWh, fijo/variable, IVA parametrizable, alquiler opcional)
  - CRUD maestros + ejecución de facturación por periodo (YYYY-MM)
  - Facturas list/detail + PDF download (estructura similar a `factura_gas_demo.pdf`)
- Frontend React/Vite:
  - CRUD de maestros (supply points, lecturas, tarifas, factores, IVA)
  - Ejecutar facturación
  - Listar facturas, ver detalle, descargar PDF

## Conventions
- API base path `/api/gas`
- Dinero: BigDecimal, HALF_UP, 2 decimales
- Errores: JSON consistente (400/404; 409 opcional)

## Quality
- Unit tests de cálculos/validaciones
- 1 integración: seed → billing → invoices → pdf
