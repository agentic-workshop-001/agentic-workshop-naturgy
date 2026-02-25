# Runbook — GAS Billing Workshop

## Prerequisitos

| Herramienta | Versión mínima |
|------------|----------------|
| Java JDK   | 17+            |
| Maven      | 3.8+           |
| Node.js    | 18+            |
| npm        | 9+             |

---

## 1. Start Backend

```bash
cd backend
mvn spring-boot:run
```

El backend arranca en **http://localhost:8080**.  
Al arrancar, el `SeedService` carga los CSV de `_data/db/samples/gas/` automáticamente.

Verificar:
```bash
curl http://localhost:8080/api/gas/supply-points
```

---

## 2. Start Frontend

```bash
cd frontend
npm install          # primera vez
npm run dev
```

La UI arranca en **http://localhost:5173**.  
Las llamadas `/api/*` se proxifican automáticamente al backend (vite.config.ts).

Build de producción:
```bash
npm --prefix frontend run build
```

---

## 3. Pasos Demo

### 3.1 Puntos de Suministro
1. Navegar a **Puntos de Suministro**
2. Verificar que se listan los CUPS cargados desde el CSV
3. Crear uno nuevo (ej. `ES0021000000099AA`, zona `ZONA1`, tarifa `RL1`, estado `ACTIVO`)
4. Editar y cambiar estado a `INACTIVO`
5. Eliminar el creado

### 3.2 Lecturas
1. Navegar a **Lecturas**
2. Filtrar por CUPS (ej. `ES0021000000001AA`)
3. Filtrar por rango de fechas
4. Crear nueva lectura con fecha y m³

### 3.3 Tarifario
1. Navegar a **Tarifario**
2. Ver tarifas RL1, RL2, RL3 cargadas
3. Crear una nueva tarifa con `vigenciaDesde`

### 3.4 Factores de Conversión
1. Navegar a **Factores de Conversión**
2. Filtrar por zona o mes
3. Crear/editar un factor

### 3.5 IVA / Impuestos
1. Navegar a **IVA / Impuestos**
2. Verificar que existe `IVA` con tasa `0.21`

### 3.6 Facturación E2E
1. Navegar a **Facturación**
2. Introducir período: `2026-01`
3. Clicar **Ejecutar facturación**
4. Ver resultado: facturas creadas y errores (si los hay)
5. En la tabla de facturas, clicar **👁 Ver detalle** para ver cabecera + líneas
6. Clicar **⬇ Descargar PDF** para descargar la factura en PDF

---

## 4. Paths SSOT + CSV Samples de Gas

| Archivo | Descripción |
|---------|-------------|
| `_data/specs/gas_csv-spec.txt` | Esquema de tablas y formato CSV |
| `_data/specs/gas_logic-spec.txt` | Lógica de facturación (cálculos, redondeo) |
| `_data/db/samples/gas/supply-points.csv` | Maestro de puntos de suministro |
| `_data/db/samples/gas/gas-readings.csv` | Lecturas de contador |
| `_data/db/samples/gas/gas-tariffs.csv` | Tarifas con vigencia |
| `_data/db/samples/gas/gas-conversion-factors.csv` | Factores de conversión por zona/mes |
| `_data/db/samples/gas/taxes.csv` | Configuración de IVA |

### Ejemplo supply-points.csv
```
cups,zona,tarifa,estado
ES0021000000001AA,ZONA1,RL1,ACTIVO
ES0021000000002AA,ZONA2,RL2,ACTIVO
```

### Ejemplo gas-readings.csv
```
cups,fecha,lectura_m3,tipo
ES0021000000001AA,2025-12-31,1000.000,REAL
ES0021000000001AA,2026-01-31,1150.000,REAL
```

### Ejemplo gas-tariffs.csv
```
tarifa,fijo_mes_eur,variable_eur_kwh,vigencia_desde
RL1,5.00,0.06500,2025-01-01
RL2,8.00,0.06200,2025-01-01
```

### Ejemplo gas-conversion-factors.csv
```
zona,mes,coef_conv,pcs_kwh_m3
ZONA1,2026-01,1.0200,11.6300
ZONA2,2026-01,1.0150,11.5800
```

### Ejemplo taxes.csv
```
taxCode,taxRate,vigencia_desde
IVA,0.21,2023-01-01
```

---

## 5. API Reference (Backend)

| Método | Path | Descripción |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/gas/supply-points` | CRUD puntos suministro |
| GET/POST/DELETE | `/api/gas/readings` | CRUD lecturas |
| GET/POST/PUT/DELETE | `/api/gas/tariffs` | CRUD tarifas |
| GET/POST/PUT/DELETE | `/api/gas/conversion-factors` | CRUD factores conversión |
| GET/POST/PUT/DELETE | `/api/gas/taxes` | CRUD IVA |
| POST | `/api/gas/billing/run?period=YYYY-MM` | Ejecutar facturación |
| GET | `/api/gas/invoices?cups=&period=` | Listar facturas |
| GET | `/api/gas/invoices/{id}` | Detalle factura |
| GET | `/api/gas/invoices/{id}/pdf` | Descargar PDF |
| DELETE | `/api/gas/invoices/{id}` | Eliminar factura |
