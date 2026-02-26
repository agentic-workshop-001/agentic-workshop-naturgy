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
npm install --legacy-peer-deps   # primera vez (requiere --legacy-peer-deps: React 19 + testing-library peer conflict)
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

---

## 6. Pipeline CI/CD

### 6.1 Configurar GitHub Secrets

Los siguientes secretos deben estar configurados en **Settings → Secrets and variables → Actions** del repositorio:

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `AWS_ROLE_TO_ASSUME` | ARN del IAM role con permisos de despliegue (OIDC) | `arn:aws:iam::123456789:role/github-deploy` |
| `ECR_REGISTRY` | URL del registro ECR | `123456789.dkr.ecr.eu-west-1.amazonaws.com` |
| `ECR_REPOSITORY` | Nombre del repositorio ECR | `gas-backend` |
| `ECS_CLUSTER` | Nombre del clúster ECS | `gas-cluster` |
| `ECS_SERVICE` | Nombre del servicio ECS | `gas-backend-service` |
| `S3_BUCKET` | Nombre del bucket S3 para la UI | `gas-frontend-staging` |
| `BACKEND_URL` | URL del backend desplegado (para SIT) | `http://my-alb.eu-west-1.elb.amazonaws.com` |
| `FRONTEND_URL` | URL del frontend desplegado (para SIT) | `http://gas-frontend-staging.s3-website-eu-west-1.amazonaws.com` |
| `SLACK_WEBHOOK_URL` | Webhook de Slack para notificaciones (opcional) | `https://hooks.slack.com/services/…` |

> **Nota:** Estos secretos se pasan por el workflow orquestador `ci.yml` a los workflows reutilizables. No se exponen en logs gracias a `::add-mask::`.

---

### 6.2 Ejecutar el Pipeline (workflow_dispatch)

Para lanzar el pipeline manualmente desde GitHub:

1. Ir a **Actions → CI/CD Pipeline** en el repositorio.
2. Clicar **Run workflow**.
3. Seleccionar los parámetros:
   - **Branch:** rama a desplegar (por defecto `main`).
   - **environment:** entorno destino (e.g. `staging`, `production`).
   - **aws_region:** región AWS (e.g. `eu-west-1`).
4. Clicar **Run workflow** para confirmar.

El pipeline sigue esta cadena de jobs:

```
build-test → deploy → sit → rca (always)
```

Cada job es un workflow reutilizable independiente:

| Workflow | Descripción |
|----------|-------------|
| `reusable-build-test.yml` | Compila backend (Maven) y frontend (Vite), ejecuta tests y sube artefactos |
| `reusable-deploy.yml` | Terraform, S3 sync, ECR push, ECS update, verificación de salud |
| `reusable-sit.yml` | Tests de integración de sistema contra el entorno desplegado |
| `reusable-rca.yml` | Notificaciones y resumen post-pipeline (siempre se ejecuta) |

---

### 6.3 Ver Evidencias (Artefactos)

Cada ejecución del pipeline sube artefactos de evidencia:

| Artefacto | Workflow | Retención | Contenido |
|-----------|----------|-----------|-----------|
| `backend-jar` | build-test | 7 días | JAR del backend compilado |
| `test-report-backend` | build-test | 7 días | Informe JaCoCo de cobertura |
| `frontend-dist` | build-test | 7 días | Build de producción de React |
| `test-report-frontend` | build-test | 7 días | Informe Vitest de cobertura |
| `terraform-outputs` | deploy | 7 días | Outputs JSON de Terraform (URLs ALB, S3) |
| `deploy-evidence` | deploy | 30 días | JSON con URLs, SHA, timestamp y estado |
| `sit-evidence` | sit | 7 días | `sit-results.json` + `invoice.pdf` (si existe) |

Para descargar artefactos:
1. Ir a **Actions → [ejecución concreta]**.
2. Hacer scroll hasta la sección **Artifacts**.
3. Clicar en el artefacto para descargarlo como ZIP.

---

### 6.4 Troubleshooting

#### ❌ `configure-aws-credentials` falla — "Could not assume role"
- Verificar que el IAM role en `AWS_ROLE_TO_ASSUME` tiene configurado el trust policy para el repositorio correcto.
- El subject del OIDC token debe coincidir: `repo:<org>/<repo>:ref:refs/heads/main` (o el ref correspondiente).
- Consultar los logs del step **Configure AWS credentials (OIDC)** para el ARN exacto intentado.

#### ❌ `Terraform apply` falla
- Revisar los outputs del step **Terraform plan** para ver los cambios previstos.
- Asegurarse de que el role IAM tiene permisos sobre los recursos Terraform (ECS, ECR, ALB, S3, IAM).
- Si el estado de Terraform está bloqueado, ejecutar `terraform force-unlock <ID>` localmente.

#### ❌ `aws ecs wait services-stable` timeout
- El servicio ECS puede tardar hasta 10 minutos en estabilizarse tras un despliegue.
- Revisar los logs de las tasks ECS en la consola AWS para ver si hay errores de arranque del contenedor.
- Verificar que la imagen Docker se ha subido correctamente al ECR.

#### ❌ Health check backend falla (5 intentos)
- Comprobar que el ALB listener está configurado para el puerto correcto (8080).
- Verificar que el security group del ALB permite tráfico HTTP entrante.
- Revisar `/actuator/health` en los logs de la task ECS.

#### ❌ SIT tests fallan
- Los artefactos `sit-evidence` contienen `sit-results.json` con el detalle de cada test.
- Verificar que `BACKEND_URL` y `FRONTEND_URL` apuntan al entorno correcto.
- Ejecutar `scripts/sit-tests.sh` localmente apuntando al entorno para reproducir el fallo.
