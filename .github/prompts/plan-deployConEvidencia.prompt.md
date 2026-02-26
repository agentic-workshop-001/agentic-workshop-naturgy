## Plan: Pipeline "Deploy con Evidencia" — Issue-Driven con Copilot Coding Agent

### Filosofía: Issues como unidad de trabajo, agentes como ejecutores

El flujo completo se orquesta mediante **GitHub Issues asignados al Copilot coding agent** con agentes custom específicos. La REST API de GitHub permite crear issues y asignarlos programáticamente al coding agent con selección de agente custom incluida.

**Flujo por issue:**
```
Crear issue (gh api) → Asignar a copilot-swe-agent[bot] + custom_agent → 
Copilot trabaja autónomamente → Abre PR (rama copilot/*) → 
Tú revisas → Comentas refinamientos → Merge → Siguiente issue
```

**Restricción clave:** Copilot solo puede trabajar en un PR a la vez. Los issues se crean todos de golpe (backlog visible = gobernanza), pero se asignan a Copilot **uno a uno** conforme se van mergeando los PRs.

---

### Prerequisitos

1. **GitHub Secrets** configurados en el repositorio:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (opcional, para credenciales temporales)
   - `AWS_REGION` (ej: `eu-west-1`)
   - `AWS_ACCOUNT_ID`

2. **Copilot coding agent** habilitado en el repositorio

3. **`gh` CLI** autenticada con permisos de escritura en issues y PRs

---

### Mapa de issues y agentes

| # | Issue | Agente custom | Depende de |
|---|-------|---------------|------------|
| 1 | Estructura de pipeline + workflow orquestador | `supermario-developer` | — |
| 2 | Verificar y completar test suites + reports | `supermario-quality` | — |
| 3 | Reusable workflow: Build & Unit Tests | `supermario-developer` | #1, #2 |
| 4 | Terraform IaC: infra AWS (S3 + ECS Fargate + ALB) | `devops-sre` | — |
| 5 | Reusable workflow: Deploy a AWS | `supermario-developer` | #3, #4 |
| 6 | Reusable workflow: SIT (pruebas integradas) | `supermario-developer` | #5 |
| 7 | Reusable workflow: RCA (diagnóstico de fallos) | `supermario-developer` | #6 |
| 8 | Validación de seguridad y calidad (audit) | `supermario-quality` | #7 |
| 9 | Consolidación: refactor + composite actions | `supermario-refactor` | #8 |

> **Nota**: Los issues 1, 2 y 4 son independientes y podrían ejecutarse en paralelo (3 sesiones de Copilot si el plan lo permite). En la práctica, para el workshop se ejecutan secuencialmente para mostrar gobernanza.

---

### Issue #1 — Estructura de pipeline + workflow orquestador

**Agente:** `supermario-developer`

```markdown
## Objetivo
Crear la estructura base de GitHub Actions con reusable workflows para un pipeline de 4 fases:
Build & Test → Deploy AWS → SIT → RCA.

## Tareas
1. Crear `.github/workflows/ci.yml` — workflow orquestador principal:
   - Triggers: `push` a `main`, `pull_request`, `workflow_dispatch`
   - Llama a los reusable workflows en secuencia: build-test → deploy → sit → rca
   - `permissions:` explícitos y mínimos (contents: read)
   - `concurrency:` por entorno (`group: deploy-${{ github.ref }}`, cancel-in-progress: false)
   - Inputs para `workflow_dispatch`: `environment` (default: staging), `aws_region`

2. Crear stubs (esqueletos) de los reusable workflows:
   - `.github/workflows/reusable-build-test.yml`
   - `.github/workflows/reusable-deploy.yml`
   - `.github/workflows/reusable-sit.yml`
   - `.github/workflows/reusable-rca.yml`
   Cada uno con `on: workflow_call`, inputs/secrets definidos, y un job placeholder.

3. Documentar los GitHub Secrets necesarios como comentario YAML en `ci.yml`:
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (opcional)
   - `AWS_REGION`, `AWS_ACCOUNT_ID`

4. Auth AWS: usar `aws-actions/configure-aws-credentials` (pinned to SHA) con secrets.
   Dejar comentario indicando migración futura a OIDC.

## Reglas
- Seguir `.github/instructions/svf-methodology.instructions.md`
- Todas las actions de terceros pinned to commit SHA
- Cada workflow con `permissions:` block explícito
- Validar con actionlint antes de commitear

## Definition of Done
- [ ] `ci.yml` orquesta los 4 reusable workflows
- [ ] Los 4 stubs existen y son YAML válido
- [ ] `actionlint .github/workflows/*.yml` pasa sin errores
- [ ] No hay secrets hardcodeados
- [ ] Permissions explícitos en todos los workflows
```

---

### Issue #2 — Verificar test suites y reports

**Agente:** `supermario-quality`

```markdown
## Objetivo
Verificar que las test suites existentes (backend + frontend) generan reports
correctamente y completar lo que falte para que el pipeline de CI pueda consumirlos.

## Contexto
El repo ya tiene:
- Backend: `SmokeTest.java`, `BillingIntegrationTest.java` (10 tests)
- Frontend: `App.test.tsx`, `validators.test.ts`
- Reports: `reports/jacoco/`, `reports/vitest/`, `reports/index.html`

## Tareas
1. Ejecutar backend tests (`mvn clean verify` en `backend/`) y verificar que JaCoCo genera HTML en `backend/target/site/jacoco/`
2. Ejecutar frontend tests (`npm run test:coverage` en `frontend/`) y verificar Vitest coverage
3. Si falta algún script/config en `package.json` o `pom.xml`, añadirlo
4. Regenerar `reports/` con datos actualizados
5. Verificar que los comandos de test son reproducibles en CI (sin GUI, sin interacción)

## Definition of Done
- [ ] `mvn clean verify` en backend pasa y genera JaCoCo HTML
- [ ] `npm run test:coverage` en frontend pasa y genera coverage HTML
- [ ] `reports/index.html` actualizado con landing unificado
- [ ] Comandos documentados en el summary para uso en CI
```

---

### Issue #3 — Reusable workflow: Build & Unit Tests

**Agente:** `supermario-developer`

```markdown
## Objetivo
Implementar `.github/workflows/reusable-build-test.yml` — el workflow de build y test
que genera los artefactos para deploy.

## Contexto
- Backend: Spring Boot (Maven, Java 17), tests con JaCoCo
- Frontend: React/Vite/TS (Node 20, npm), tests con Vitest
- El stub ya existe del Issue #1

## Tareas
1. **Job `build-backend`:**
   - `actions/setup-java` (Java 17, distribution: temurin)
   - Cache Maven: `actions/cache` para `~/.m2/repository`
   - `cd backend && mvn clean verify -B`
   - Upload artefactos: `backend/target/*.jar` como `backend-jar`
   - Upload JaCoCo report: `backend/target/site/jacoco/` como `test-report-backend`

2. **Job `build-frontend`:**
   - `actions/setup-node` (Node 20, cache: npm)
   - `cd frontend && npm ci && npm run build && npm run test:coverage`
   - Upload artefactos: `frontend/dist/` como `frontend-dist`
   - Upload Vitest coverage: como `test-report-frontend`

3. Los dos jobs corren en paralelo (sin `needs:` entre ellos)

4. Outputs del workflow: nombres de los artefactos para que el deploy workflow los descargue

## Reglas
- Actions pinned to SHA (buscar últimas versiones estables)
- `permissions: contents: read`
- Steps con nombres descriptivos
- Cache con key basado en lockfile hash

## Definition of Done
- [ ] Backend compila y tests pasan en CI
- [ ] Frontend compila y tests pasan en CI  
- [ ] 4 artefactos subidos: jar, dist, report-backend, report-frontend
- [ ] `actionlint` pasa sin errores
- [ ] Cache funcional (hit en segunda ejecución)
```

---

### Issue #4 — Terraform IaC: infraestructura AWS

**Agente:** `devops-sre`

```markdown
## Objetivo
Crear la infraestructura como código (Terraform) para desplegar la aplicación en AWS:
frontend estático en S3, backend Spring Boot en ECS Fargate con ALB.

## Arquitectura destino
```
                    ┌─────────────┐
                    │  CloudFront │ (opcional, futuro)
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐           ┌──────▼──────┐
        │  S3 Bucket │           │     ALB      │
        │  (frontend)│           │  (backend)   │
        └───────────┘           └──────┬──────┘
                                       │
                                ┌──────▼──────┐
                                │ ECS Fargate  │
                                │ (Spring Boot)│
                                └──────┬──────┘
                                       │
                                ┌──────▼──────┐
                                │     ECR      │
                                │ (Docker img) │
                                └─────────────┘
```

## Tareas
1. Crear `terraform/` con:
   - `main.tf` — provider AWS, terraform settings (required_version >= 1.5), backend local (o S3 si disponible)
   - `variables.tf` — `aws_region`, `environment`, `app_name` (default: naturgy-gas), `app_port` (default: 8080)
   - `s3.tf` — Bucket S3 con website hosting, bucket policy pública para lectura
   - `ecr.tf` — ECR repository para imagen Docker del backend
   - `vpc.tf` — VPC con subnets públicas (mínimo 2 AZs) para ALB + Fargate
   - `ecs.tf` — ECS Cluster Fargate + Task Definition (256 CPU, 512 MiB) + Service
   - `alb.tf` — ALB + Target Group (health check: `/actuator/health`) + Listener (HTTP:80)
   - `iam.tf` — ECS task execution role + ECS task role con políticas mínimas
   - `outputs.tf` — `frontend_url`, `backend_url`, `ecr_repository_url`, `ecs_cluster_name`, `ecs_service_name`

2. Crear `backend/Dockerfile`:
   - Multi-stage: Maven build → Java 17 runtime (eclipse-temurin:17-jre-alpine)
   - COPY del JAR, EXPOSE 8080, health check integrado
   - El Dockerfile debe copiar también `_data/` para los CSV de seed

3. Tagging obligatorio en todos los recursos:
   - `Environment`, `Owner`, `Project = naturgy-gas-workshop`, `ManagedBy = terraform`

## Reglas
- Seguir `.github/instructions/devops.terraform.instructions.md` y `devops.aws.instructions.md`
- `terraform fmt` y `terraform validate` deben pasar
- No hardcodear valores de cuenta/región (usar variables)
- Usar data sources para AZs disponibles

## Definition of Done
- [ ] `terraform init` → `terraform validate` → `terraform fmt -check` pasan
- [ ] Todos los recursos tagueados correctamente
- [ ] `outputs.tf` expone URLs necesarias para el pipeline
- [ ] `Dockerfile` construye correctamente (`docker build -t test .`)
- [ ] Sin credenciales hardcodeadas
```

---

### Issue #5 — Reusable workflow: Deploy a AWS

**Agente:** `supermario-developer`

```markdown
## Objetivo
Implementar `.github/workflows/reusable-deploy.yml` — despliega frontend a S3,
backend como contenedor Docker a ECS Fargate, y genera evidencia del deploy.

## Prerequisitos (de issues anteriores)
- Artefactos `backend-jar` y `frontend-dist` del build workflow (#3)
- Terraform IaC en `terraform/` (#4)
- Dockerfile en `backend/` (#4)

## Tareas
1. **Job `deploy-infra`:**
   - Configurar AWS credentials (secrets)
   - `actions/setup-terraform` (pinned to SHA)
   - `cd terraform && terraform init && terraform plan -out=tfplan`
   - `terraform apply -auto-approve tfplan`
   - Capturar outputs: `terraform output -json > deploy-outputs.json`
   - Upload `deploy-outputs.json` como artefacto

2. **Job `deploy-frontend`** (needs: deploy-infra):
   - Descargar artefacto `frontend-dist`
   - Leer bucket name de `deploy-outputs.json`
   - `aws s3 sync dist/ s3://${BUCKET_NAME} --delete`

3. **Job `deploy-backend`** (needs: deploy-infra):
   - Descargar artefacto `backend-jar` (o hacer docker build in-situ)
   - Login a ECR: `aws ecr get-login-password | docker login`
   - `docker build -t ${ECR_URL}:${GITHUB_SHA} ./backend`
   - `docker push ${ECR_URL}:${GITHUB_SHA}`
   - Update ECS service: `aws ecs update-service --force-new-deployment`
   - Esperar a estabilización: `aws ecs wait services-stable`

4. **Job `verify-deploy`** (needs: deploy-frontend, deploy-backend):
   - Health check backend: `curl --retry 10 --retry-delay 5 ${BACKEND_URL}/actuator/health`
   - Verificar frontend accesible: `curl -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL}`
   - Generar `deploy-evidence.json` con: URLs, timestamps, commit SHA, status codes
   - Upload como artefacto `deploy-evidence`

## Reglas
- Seguir `svf-methodology.instructions.md`
- No exponer secrets en logs (`::add-mask::`)
- Retry logic en health checks
- Actions pinned to SHA

## Definition of Done
- [ ] Terraform apply crea/actualiza infraestructura
- [ ] Frontend accesible vía S3 URL
- [ ] Backend health check OK vía ALB
- [ ] `deploy-evidence.json` adjunto como artefacto
- [ ] `actionlint` pasa sin errores
```

---

### Issue #6 — Reusable workflow: SIT (pruebas integradas)

**Agente:** `supermario-developer`

```markdown
## Objetivo
Implementar `.github/workflows/reusable-sit.yml` — ejecuta pruebas de integración
de sistema (SIT) contra el entorno desplegado. Este es el "momento wow" del workshop:
subir datos CSV → generar facturas → verificar totales → descargar PDF.

## Inputs
- `backend_url` — URL del backend (ALB) del deploy
- `frontend_url` — URL del frontend (S3) del deploy

## Tareas
1. Crear `scripts/sit-tests.sh` — script bash que ejecuta las pruebas SIT:

   ```bash
   # 1. Upload CSV data via API
   curl -X POST ${BACKEND_URL}/api/supply-points/upload -F "file=@_data/db/samples/gas/supply-points.csv"
   curl -X POST ${BACKEND_URL}/api/readings/upload -F "file=@_data/db/samples/gas/gas-readings.csv"
   curl -X POST ${BACKEND_URL}/api/tariffs/upload -F "file=@_data/db/samples/gas/gas-tariffs.csv"
   curl -X POST ${BACKEND_URL}/api/conversion-factors/upload -F "file=@_data/db/samples/gas/gas-conversion-factors.csv"
   curl -X POST ${BACKEND_URL}/api/taxes/upload -F "file=@_data/db/samples/gas/taxes.csv"

   # 2. Generate billing
   curl -X POST "${BACKEND_URL}/api/billing/generate?cups=ES0021000000000001AA&period=2026-01"

   # 3. Verify invoices exist
   INVOICES=$(curl -s ${BACKEND_URL}/api/invoices)
   INVOICE_COUNT=$(echo $INVOICES | jq length)
   [ "$INVOICE_COUNT" -gt 0 ] || exit 1

   # 4. Verify PDF download
   INVOICE_ID=$(echo $INVOICES | jq -r '.[0].id')
   curl -s -o invoice.pdf ${BACKEND_URL}/api/invoices/${INVOICE_ID}/pdf
   [ -s invoice.pdf ] || exit 1

   # 5. Output evidence
   echo $INVOICES | jq '.' > sit-results.json
   ```

2. **Job `sit-tests`** en el workflow:
   - Instalar `jq` y `curl`
   - Ejecutar `scripts/sit-tests.sh`
   - Upload artefactos: `sit-results.json`, `invoice.pdf`

3. Verificaciones mínimas:
   - Al menos 1 factura generada
   - Total > 0
   - PDF descargable (Content-Type: application/pdf, size > 0)
   - Respuestas HTTP 200 en todos los endpoints

## Definition of Done
- [ ] Script SIT ejecuta end-to-end contra entorno desplegado
- [ ] Facturas generadas correctamente
- [ ] PDF descargado y adjunto como artefacto
- [ ] `sit-results.json` con evidencia de totales
- [ ] `actionlint` pasa sin errores
```

---

### Issue #7 — Reusable workflow: RCA (diagnóstico de fallos)

**Agente:** `supermario-developer`

```markdown
## Objetivo
Implementar `.github/workflows/reusable-rca.yml` — recolecta logs y genera un
informe de root cause analysis cuando las pruebas SIT fallan.

## Cuándo se ejecuta
Solo si el job de SIT (Issue #6) falla: `if: failure()`

## Tareas
1. **Job `collect-logs`:**
   - Configurar AWS credentials
   - Obtener logs de CloudWatch del ECS service (últimos 15 min):
     ```bash
     aws logs filter-log-events \
       --log-group-name /ecs/naturgy-gas \
       --start-time $(date -d '15 minutes ago' +%s000) \
       --output text > ecs-logs.txt
     ```
   - Obtener eventos del ECS service:
     ```bash
     aws ecs describe-services \
       --cluster naturgy-gas \
       --services naturgy-gas-backend \
       --query 'services[0].events[:10]' > ecs-events.json
     ```

2. **Job `generate-rca`** (needs: collect-logs):
   - Generar `rca-report.md` con 3 secciones:
     - **Qué falló**: Step que falló + error message de los logs
     - **Dónde falló**: Servicio/recurso AWS afectado
     - **Siguiente acción**: Recomendación de fix
   - Template:
     ```markdown
     # RCA Report — ${DATE}
     ## Qué falló
     - [extraer del log de errores]
     ## Dónde falló
     - Servicio: ECS / S3 / ALB
     - Log group: /ecs/naturgy-gas
     ## Siguiente acción
     - [recomendación]
     ```

3. Upload artefactos: `rca-report.md`, `ecs-logs.txt`, `ecs-events.json`

## Definition of Done
- [ ] Logs recolectados de CloudWatch
- [ ] `rca-report.md` generado con 3 bullets
- [ ] Artefactos adjuntos al pipeline
- [ ] Solo se ejecuta si SIT falla
- [ ] `actionlint` pasa sin errores
```

---

### Issue #8 — Validación de seguridad y calidad

**Agente:** `supermario-quality`

```markdown
## Objetivo
Ejecutar audit completo de seguridad y calidad sobre todos los workflows y Terraform
creados en los issues anteriores.

## Tareas
1. **Syntax validation:**
   - `actionlint .github/workflows/*.yml` → 0 errores
   - `yamllint .github/workflows/` → 0 errores
   - `terraform validate` y `terraform fmt -check` en `terraform/`

2. **Security checklist:**
   - [ ] Todos los workflows tienen `permissions:` block explícito
   - [ ] AWS auth usa secrets (no hardcoded)
   - [ ] Secrets no expuestos en logs (verificar `::add-mask::` donde aplique)
   - [ ] Third-party actions pinned to commit SHA (no tags mutables)
   - [ ] No hay `pull_request_target` sin protección

3. **Quality checklist:**
   - [ ] `concurrency:` configurado para evitar deploys paralelos
   - [ ] Cache implementado para Maven y npm
   - [ ] Health checks con retry logic
   - [ ] Steps con nombres descriptivos
   - [ ] No hay duplicación entre workflows (candidatos para composite actions)

4. **Terraform security:**
   - [ ] IAM roles con least privilege
   - [ ] S3 bucket no tiene ACL pública innecesaria
   - [ ] Security groups restrictivos
   - [ ] Recursos tagueados

5. Crear un issue de seguimiento si hay algo que mejorar

## Definition of Done
- [ ] 0 errores en actionlint y yamllint
- [ ] Security checklist completado al 100%
- [ ] Quality checklist completado al 100%
- [ ] Terraform validate y fmt pasan
- [ ] Informe de findings en el PR
```

---

### Issue #9 — Consolidación: refactor + composite actions

**Agente:** `supermario-refactor`

```markdown
## Objetivo
Refactorizar los workflows para eliminar duplicación, extraer composite actions,
y actualizar la documentación.

## Tareas
1. **Extraer composite actions** para patrones repetidos:
   - `.github/actions/aws-auth/action.yml` — configurar AWS credentials (reutilizado en deploy, sit, rca)
   - `.github/actions/upload-evidence/action.yml` — subir artefactos de evidencia con metadata

2. **Optimizar workflows:**
   - Reemplazar steps duplicados con las composite actions
   - Consolidar inputs/secrets comunes
   - Verificar que el behavior es idéntico antes y después

3. **Actualizar documentación:**
   - Añadir sección "Pipeline CI/CD" en `RUNBOOK.md`:
     - Cómo configurar GitHub Secrets
     - Cómo ejecutar el pipeline (workflow_dispatch)
     - Cómo ver evidencias (artefactos)
     - Troubleshooting común
   - Actualizar `README.md` si existe

4. **Verificación final:**
   - `actionlint` pasa en todos los workflows (incluidos los refactorizados)
   - Los composite actions funcionan correctamente

## Definition of Done
- [ ] Composite actions extraídas y funcionando
- [ ] 0 duplicación entre workflows
- [ ] RUNBOOK.md actualizado con sección de pipeline
- [ ] `actionlint` pasa sin errores post-refactor
```

---

### Script de automatización

El script `scripts/create-pipeline-issues.sh` crea todos los issues y permite
asignarlos a Copilot con el agente custom correcto.

**Uso:**
```bash
# Paso 1: Crear todos los issues (backlog visible)
./scripts/create-pipeline-issues.sh create

# Paso 2: Asignar Copilot al issue que quieras iniciar
./scripts/create-pipeline-issues.sh assign <issue_number>

# Paso 3: Después de merge del PR, asignar el siguiente
./scripts/create-pipeline-issues.sh assign <next_issue_number>
```

**API utilizada** (REST):
```bash
# Crear issue
gh api --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/{OWNER}/{REPO}/issues \
  --input - <<< '{
    "title": "...",
    "body": "...",
    "labels": ["pipeline", "copilot-agent"]
  }'

# Asignar a Copilot con agente custom
gh api --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/{OWNER}/{REPO}/issues/{NUMBER}/assignees \
  --input - <<< '{
    "assignees": ["copilot-swe-agent[bot]"],
    "agent_assignment": {
      "target_repo": "{OWNER}/{REPO}",
      "base_branch": "main",
      "custom_agent": "supermario-developer",
      "custom_instructions": "",
      "model": ""
    }
  }'
```

---

### Flujo visual del workshop

```
┌─────────────────────────────────────────────────────────┐
│  PASO 1: crear backlog (todos los issues de golpe)      │
│  $ ./scripts/create-pipeline-issues.sh create           │
│  → 9 issues creados, visibles en el board               │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 2: asignar Copilot al Issue #1                    │
│  $ ./scripts/create-pipeline-issues.sh assign 1         │
│  → Copilot reacciona 👀, crea rama copilot/...          │
│  → Trabaja autónomamente                                │
│  → Abre PR draft                                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 3: revisar PR                                     │
│  Tú: revisar código, comentar refinamientos             │
│  Copilot: itera sobre comentarios                       │
│  Tú: aprobar + merge                                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 4: repetir para Issue #2, #3, ... #9              │
│  $ ./scripts/create-pipeline-issues.sh assign 2         │
│  ...                                                    │
│  Resultado final: pipeline completo con evidencias      │
└─────────────────────────────────────────────────────────┘
```

---

### Decisiones tomadas

| Decisión | Valor | Justificación |
|----------|-------|---------------|
| **Deploy target** | S3 + ECS Fargate | Enterprise-grade, demuestra contenedores |
| **IaC** | Terraform | Portable, bien soportado por devops-sre agent |
| **Auth AWS** | Keys en Secrets | Plan B; preparado para migrar a OIDC |
| **Estructura pipeline** | Reusable workflows | Modular, un issue por workflow |
| **Orquestación** | Issues → Copilot coding agent | Gobernanza visible, trazable |
| **Agente DevOps** | `devops-sre` solo para Terraform | Evitar conflicto con supermario; se unifican después |

### Resumen de asignación de agentes

| Issue | Agente (`custom_agent`) | Qué hace |
|-------|-------------------------|----------|
| #1 | `supermario-developer` | Estructura + orquestador |
| #2 | `supermario-quality` | Verificar tests y reports |
| #3 | `supermario-developer` | Build & Test workflow |
| #4 | `devops-sre` | Terraform IaC + Dockerfile |
| #5 | `supermario-developer` | Deploy workflow |
| #6 | `supermario-developer` | SIT workflow + script |
| #7 | `supermario-developer` | RCA workflow |
| #8 | `supermario-quality` | Security + quality audit |
| #9 | `supermario-refactor` | Consolidar + documentar |
