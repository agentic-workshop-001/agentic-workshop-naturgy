# Runbook — GAS Billing Workshop

## 🎨 UI Refactor — Naturgy React Standards (latest)

### Changes Applied
Following SSOT: `_data/specs/react-standards.md` (Naturgy React Standards, MUI v5/v7)

| Area | Change |
|------|--------|
| `src/index.css` | Replaced Vite boilerplate (dark background, conflicting button styles) with minimal reset — MUI CssBaseline handles the rest |
| `src/app/theme.ts` | Enhanced with Naturgy brand tokens, component overrides (Button: no elevation + sentence-case, Card/Paper: consistent shadow, Dialog: rounded 12px, LinearProgress: 4px height) |
| `src/shared/api/httpClient.ts` | Per-status error mapping: 400→server message, 404→"Recurso no encontrado", 500→"Error interno del servidor" |
| `src/app/Layout.tsx` | Naturgy-branded sidebar header (navy bg + fire icon + subtitle), rounded nav items, version footer |
| `src/shared/ui/PageHeader.tsx` | New — reusable page header component (`Typography h4` + right-aligned action slot) |
| `src/shared/ui/FeedbackSnackbar.tsx` | New — reusable success Snackbar (filled Alert) per standards |
| All CRUD pages | Use `PageHeader` + `FeedbackSnackbar`; save buttons now show `CircularProgress` spinner while loading |
| Date inputs | Migrated from deprecated `InputLabelProps`/`inputProps` → MUI v6/v7 `slotProps` API |

**Validated:** `npm run build` ✅  `npm run lint` ✅

---

## 🔧 Recent Fixes (2026-02-25)

### Backend Bugs

#### Bug #1: JPQL LIMIT Syntax Error
**Problema:** Las queries en `GasReadingRepository`, `GasTariffRepository`, y `TaxConfigRepository` usaban `LIMIT 1` en JPQL, que no es estándar (solo en SQL nativo).

**Causa raíz:** Sintaxis JPQL incorrecta causaba fallos silenciosos en queries de búsqueda de tarifas activas y configuraciones de impuestos.

**Fix aplicado:**
- Convertir queries a **SQL nativo** (`nativeQuery = true`)
- Cambiar nombres de campos a snake_case (formato DB: `vigencia_desde`, `gas_reading`, etc.)
- Ejemplos:
  - JPQL: `SELECT t FROM GasTariff t ... LIMIT 1` → SQL: `SELECT * FROM gas_tariff ... LIMIT 1`

**Validación:** 
```bash
mvn test  # ✅ 10/10 tests passed
```

---

#### Bug #2: CSV Seed Path Resolution on Windows
**Problema:** Al ejecutar desde `backend/`, el `SeedService` no encontraba los CSV porque la ruta relativa `_data/db/samples` se interpretaba como `backend/_data/db/samples/`.

**Causa raíz:** `Paths.get(dataDir).toAbsolutePath()` usa el separador de plataforma y es relativo al directorio actual de ejecución. Sin fallback, fallaba cuando Maven se ejecutaba desde `backend/`.

**Fix aplicado:**
- Resolver la ruta a absoluta
- Si no existe, intentar desde el directorio padre (maneja caso de ejecutar desde `backend/`)
- Logging mejorado mostrando: ruta original + ruta resuelta absoluta

**Código:**
```java
Path dataDirPath = Paths.get(dataDir).toAbsolutePath();
if (!Files.exists(dataDirPath)) {
    Path parentPath = Paths.get("..", dataDir).toAbsolutePath().normalize();
    if (Files.exists(parentPath)) {
        dataDirPath = parentPath;
    }
}
```

**Validación:**
```
Seed: data directory = _data/db/samples (resolved to: C:\Proyectos\Naturgy\agentic-workshop-naturgy\_data\db\samples)
supply-points: inserted=3, skipped=0
gas-tariffs: inserted=3, skipped=0
gas-conversion-factors: inserted=4, skipped=0
taxes: inserted=1, skipped=0
gas-readings: inserted=6, skipped=0, invalidDate=0
```

---

### Frontend Bugs

#### Bug #3: "cups and fecha are required" - Incorrect Payload Serialization
**Problema:** Al crear una lectura de gas (POST /api/gas/readings), el frontend enviaba un payload con `cups` y `fecha` como campos planos, pero el backend esperaba que se mapearan al `EmbeddedId` automáticamente. Esto causaba que el backend validara `reading.getId() == null` y rechazara con error "cups and fecha are required".

**Causa raíz:**
1. El backend `GasReading` tiene una estructura con `@EmbeddedId` de tipo `GasReadingId` (contiene `cups` y `fecha`)
2. Spring no mapea automáticamente campos planos JSON al `EmbeddedId`
3. El frontend enviaba: `{cups: "...", fecha: "...", lecturaM3: ..., tipo: "..."}` 
4. El backend recibía con `reading.getId() == null` → error

**Fix aplicado:**
1. **Backend:** Crear un **DTO de entrada** `CreateReadingRequest` que acepta campos planos
   - Archivo: `backend/src/main/java/com/naturgy/gas/controller/CreateReadingRequest.java`
   - El controlador valida y construye el `GasReadingId` internamente
   - Mensajes de error mejorados en español (ej: "cups es obligatorio", "fecha es obligatoria")

2. **Frontend:** Crear validadores reutilizables y mejorar manejo de errores
   - Archivo: `frontend/src/features/readings/validators.ts`
   - Validación exhaustiva antes de enviar (cups no vacío, fecha en formato YYYY-MM-DD, lecturaM3 >= 0, tipo válido)
   - Archivo de test: `validators.test.ts` (para verificar regresiones futuras)
   - Mejorado manejo de errores del backend en `ReadingsPage.tsx`

**Código Backend (CreateReadingRequest):**
```java
@PostMapping
public ResponseEntity<GasReading> create(@RequestBody CreateReadingRequest request) {
    // Validate required fields
    if (request.getCups() == null || request.getCups().trim().isEmpty()) {
        throw new IllegalArgumentException("cups es obligatorio");
    }
    if (request.getFecha() == null || request.getFecha().trim().isEmpty()) {
        throw new IllegalArgumentException("fecha es obligatoria");
    }
    // ... más validaciones
    
    // Build entity
    LocalDate fecha = parseDate(request.getFecha());
    GasReading.TipoEnum tipo = GasReading.TipoEnum.valueOf(request.getTipo().toUpperCase());
    GasReading.GasReadingId id = new GasReading.GasReadingId(request.getCups(), fecha);
    
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(repo.save(new GasReading(request.getCups(), fecha, request.getLecturaM3(), tipo)));
}
```

**Código Frontend (Validadores):**
```typescript
export function validateGasReading(reading: Partial<GasReading>): ValidationErrors {
    const errors: ValidationErrors = {};
    
    // Validate CUPS
    if (!reading.cups || !reading.cups.trim()) {
        errors.cups = 'CUPS es obligatorio (no puede estar vacío)';
    }
    
    // Validate fecha
    if (!reading.fecha || !reading.fecha.trim()) {
        errors.fecha = 'Fecha es obligatoria';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(reading.fecha)) {
        errors.fecha = 'Fecha debe estar en formato YYYY-MM-DD (ej: 2026-02-25)';
    }
    
    // Validate lecturaM3 >= 0
    if (reading.lecturaM3 === undefined || reading.lecturaM3 < 0) {
        errors.lecturaM3 = 'Lectura m³ debe ser un número >= 0';
    }
    
    // Validate tipo
    if (!reading.tipo || !['REAL', 'ESTIMADA'].includes(reading.tipo)) {
        errors.tipo = 'Tipo debe ser REAL o ESTIMADA';
    }
    
    return errors;
}
```

**Validación:**
- ✅ Backend tests: 10/10 passed
- ✅ Frontend build: Success (sin errores de compilación)
- ✅ Frontend lint: Success (sin errores de linting)
- ✅ Formulario valida antes de enviar
- ✅ Errores del backend mostrados en UI
- ✅ Mensajes en español para mejor UX

---

gas-readings: inserted=6, skipped=0, invalidDate=0
```

---

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
