#!/usr/bin/env python3
"""Create pipeline issues and optionally assign Copilot coding agent."""

import json
import subprocess
import sys
import time

REPO = "agentic-workshop-001/agentic-workshop-naturgy"
BASE_BRANCH = "feature/cicd-pipeline-setup"
LABELS = ["pipeline", "copilot-agent"]

ISSUES = [
    {
        "title": "Pipeline #1: Estructura de pipeline + workflow orquestador",
        "agent": "supermario-developer",
        "body": """## Objetivo
Crear la estructura base de GitHub Actions con reusable workflows para un pipeline de 4 fases:
Build & Test → Deploy AWS → SIT → RCA.

## Contexto del proyecto
- **Backend**: Spring Boot (Java 17, Maven) en `backend/` — puerto 8080, API en `/api/gas/*`
- **Frontend**: React/Vite/TS (Node 20) en `frontend/` — build con `npm run build`
- **Base branch**: `feature/cicd-pipeline-setup`

## Tareas
1. Crear `.github/workflows/ci.yml` — workflow orquestador principal:
   - Triggers: `push` a `main`, `pull_request`, `workflow_dispatch`
   - Llama a los reusable workflows en secuencia: build-test → deploy → sit → rca
   - `permissions:` explícitos y mínimos (contents: read)
   - `concurrency:` por entorno (cancel-in-progress: false)
   - Inputs para `workflow_dispatch`: `environment` (default: staging), `aws_region`

2. Crear stubs de los reusable workflows:
   - `.github/workflows/reusable-build-test.yml`
   - `.github/workflows/reusable-deploy.yml`
   - `.github/workflows/reusable-sit.yml`
   - `.github/workflows/reusable-rca.yml`
   Cada uno con `on: workflow_call`, inputs/secrets definidos, y un job placeholder.

3. Auth AWS: usar `aws-actions/configure-aws-credentials` (pinned to SHA) con secrets.

4. Documentar GitHub Secrets necesarios como comentario YAML en `ci.yml`.

## Reglas
- Actions de terceros pinned to commit SHA con comentario de versión
- Cada workflow con `permissions:` block explícito
- Validar con actionlint antes de commit

## Definition of Done
- [ ] `ci.yml` orquesta los 4 reusable workflows
- [ ] Los 4 stubs existen y son YAML válido
- [ ] `actionlint` pasa sin errores
- [ ] No hay secrets hardcodeados
- [ ] Permissions explícitos en todos los workflows"""
    },
    {
        "title": "Pipeline #2: Verificar test suites y reports",
        "agent": "supermario-quality",
        "body": """## Objetivo
Verificar que las test suites existentes (backend + frontend) generan reports
correctamente y completar lo que falte para que el pipeline de CI pueda consumirlos.

## Contexto
- Backend: `SmokeTest.java`, `BillingIntegrationTest.java` (10 tests pasando)
- Frontend: `App.test.tsx`, `validators.test.ts`
- Reports existentes: `reports/jacoco/`, `reports/vitest/`, `reports/index.html`
- npm requiere `--legacy-peer-deps` (React 19 + testing-library peer conflict)

## Tareas
1. Ejecutar backend tests (`cd backend && mvn clean verify`) y verificar JaCoCo HTML
2. Ejecutar frontend tests (`cd frontend && npm ci --legacy-peer-deps && npm run test:coverage`)
3. Si falta config en `package.json` o `pom.xml`, añadirla
4. Regenerar `reports/` con datos actualizados
5. Verificar que los comandos son reproducibles en CI (sin GUI, sin interacción)

## Definition of Done
- [ ] `mvn clean verify` en backend pasa y genera JaCoCo HTML
- [ ] `npm run test:coverage` en frontend pasa y genera coverage HTML
- [ ] `reports/index.html` actualizado
- [ ] Comandos de test documentados para uso en CI"""
    },
    {
        "title": "Pipeline #3: Reusable workflow — Build & Unit Tests",
        "agent": "supermario-developer",
        "body": """## Objetivo
Implementar `.github/workflows/reusable-build-test.yml` — workflow de build y test
que genera los artefactos para deploy.

## Contexto
- Backend: Spring Boot (Maven, Java 17), tests con JaCoCo
- Frontend: React/Vite/TS (Node 20, npm), tests con Vitest
- npm install requiere `--legacy-peer-deps`
- El stub ya existe del Issue #1

## Tareas
1. **Job `build-backend`:**
   - `actions/setup-java` (Java 17, distribution: temurin, cache: maven)
   - `cd backend && mvn clean verify -B`
   - Upload: `backend/target/*.jar` como `backend-jar`
   - Upload: JaCoCo report como `test-report-backend`

2. **Job `build-frontend`:**
   - `actions/setup-node` (Node 20, cache: npm, cache-dependency-path: frontend/package-lock.json)
   - `cd frontend && npm ci --legacy-peer-deps && npm run build && npm run test:coverage`
   - Upload: `frontend/dist/` como `frontend-dist`
   - Upload: Vitest coverage como `test-report-frontend`

3. Jobs en paralelo (sin `needs:` entre ellos)

4. Outputs del workflow: nombres de artefactos para deploy

## Reglas
- Actions pinned to SHA
- `permissions: contents: read`
- Steps con nombres descriptivos
- Cache con key basado en lockfile hash

## Definition of Done
- [ ] Backend compila y tests pasan
- [ ] Frontend compila y tests pasan
- [ ] 4 artefactos subidos: jar, dist, report-backend, report-frontend
- [ ] `actionlint` pasa sin errores"""
    },
    {
        "title": "Pipeline #4: Terraform IaC — infraestructura AWS",
        "agent": "devops-sre",
        "body": """## Objetivo
Crear la infraestructura como código (Terraform) para desplegar la aplicación en AWS:
frontend estático en S3, backend en ECS Fargate con ALB.

## Arquitectura
```
S3 Bucket (frontend static) ← React build
ALB → ECS Fargate (backend Spring Boot) ← Docker from ECR
```

## Contexto técnico validado localmente
- Backend: puerto 8080, API en `/api/gas/*`, NO tiene actuator
- Health check: `GET /api/gas/supply-points` (devuelve JSON array)
- Dockerfile ya existe en raíz del proyecto (multi-stage, eclipse-temurin:17)
- El Dockerfile necesita `_data/` (CSVs para seed) copiado al container
- Frontend: build estático en `dist/`, SPA routing (index.html como error doc)

## Tareas
1. Crear `terraform/` con estructura modular:
   - `main.tf` — provider AWS, backend config
   - `variables.tf` — aws_region, environment, app_name, app_port (8080)
   - `networking.tf` — VPC con subnets públicas (2 AZs mínimo)
   - `ecr.tf` — ECR repository
   - `ecs.tf` — Cluster + Task Definition (256 CPU, 512 MiB) + Service
   - `alb.tf` — ALB + Target Group (health: `/api/gas/supply-points`) + Listener HTTP:80
   - `s3.tf` — Bucket con website hosting + política de lectura pública
   - `iam.tf` — ECS execution role + task role (least privilege)
   - `outputs.tf` — frontend_url, backend_url, ecr_repository_url

2. Tagging obligatorio: Environment, Owner, Project, ManagedBy=terraform

3. NO usar `/actuator/health` — el backend no tiene actuator. Usar `/api/gas/supply-points` como health check.

## Definition of Done
- [ ] `terraform init && terraform validate && terraform fmt -check` pasan
- [ ] Todos los recursos tagueados
- [ ] `outputs.tf` expone URLs necesarias
- [ ] Health check apunta a `/api/gas/supply-points` (NO actuator)
- [ ] Sin credenciales hardcodeadas"""
    },
    {
        "title": "Pipeline #5: Reusable workflow — Deploy a AWS",
        "agent": "supermario-developer",
        "body": """## Objetivo
Implementar `.github/workflows/reusable-deploy.yml` — despliega frontend a S3,
backend como contenedor Docker a ECS Fargate.

## Contexto
- Artefactos `backend-jar` y `frontend-dist` vienen del build workflow (#3)
- Terraform IaC en `terraform/` (#4)
- Dockerfile en raíz del proyecto (build context = raíz, incluye `_data/`)

## Tareas
1. **Job `deploy-infra`:**
   - AWS credentials via secrets
   - `terraform init && terraform plan -out=tfplan && terraform apply -auto-approve tfplan`
   - Capturar outputs: `terraform output -json > deploy-outputs.json`

2. **Job `deploy-frontend`** (needs: deploy-infra):
   - Descargar artefacto `frontend-dist`
   - `aws s3 sync dist/ s3://$BUCKET_NAME --delete`

3. **Job `deploy-backend`** (needs: deploy-infra):
   - Login ECR: `aws ecr get-login-password | docker login`
   - `docker build -t $ECR_URL:$GITHUB_SHA .` (desde raíz, incluye _data/)
   - `docker push`
   - `aws ecs update-service --force-new-deployment`
   - `aws ecs wait services-stable`

4. **Job `verify-deploy`** (needs: deploy-frontend, deploy-backend):
   - Health check backend con retry
   - Verificar frontend accesible
   - Generar `deploy-evidence.json` con URLs, timestamps, SHA, status

## Reglas
- No exponer secrets en logs (`::add-mask::`)
- Retry logic en health checks
- Actions pinned to SHA

## Definition of Done
- [ ] Terraform apply crea/actualiza infraestructura
- [ ] Frontend accesible vía S3 URL
- [ ] Backend health check OK vía ALB
- [ ] `deploy-evidence.json` adjunto como artefacto
- [ ] `actionlint` pasa"""
    },
    {
        "title": "Pipeline #6: Reusable workflow — SIT (pruebas integradas)",
        "agent": "supermario-developer",
        "body": """## Objetivo
Implementar `.github/workflows/reusable-sit.yml` — pruebas de integración de sistema
contra el entorno desplegado. Flujo: datos CSV → generar facturas → verificar → PDF.

## Inputs
- `backend_url` — URL del backend (ALB)
- `frontend_url` — URL del frontend (S3)

## Contexto API (validado localmente)
- Endpoints: `/api/gas/supply-points`, `/api/gas/readings`, `/api/gas/tariffs`,
  `/api/gas/conversion-factors`, `/api/gas/taxes`, `/api/gas/billing`, `/api/gas/invoices`
- La app seed datos automáticamente desde `_data/` al arrancar
- Billing: `POST /api/gas/billing/run`
- Invoices: `GET /api/gas/invoices`, `GET /api/gas/invoices/{id}/pdf`

## Tareas
1. Crear `scripts/sit-tests.sh`:
   - Verificar backend accesible (health check con retry)
   - Verificar supply-points tienen datos (seeded)
   - Ejecutar billing: `POST /api/gas/billing/run`
   - Verificar facturas generadas: `GET /api/gas/invoices` → count > 0
   - Descargar PDF: `GET /api/gas/invoices/{id}/pdf` → archivo válido
   - Generar `sit-results.json` con evidencia

2. **Job `sit-tests`:**
   - Instalar `jq` y `curl`
   - Ejecutar `scripts/sit-tests.sh`
   - Upload: `sit-results.json`, `invoice.pdf`

## Definition of Done
- [ ] Script SIT ejecuta end-to-end
- [ ] Al menos 1 factura generada
- [ ] PDF descargado y adjunto
- [ ] `sit-results.json` con evidencia
- [ ] `actionlint` pasa"""
    },
    {
        "title": "Pipeline #7: Reusable workflow — RCA (diagnóstico de fallos)",
        "agent": "supermario-developer",
        "body": """## Objetivo
Implementar `.github/workflows/reusable-rca.yml` — recolecta logs y genera informe
de root cause analysis cuando SIT falla.

## Cuándo se ejecuta
Solo si SIT falla: `if: failure()`

## Tareas
1. **Job `collect-logs`:**
   - AWS credentials
   - Obtener logs de CloudWatch (últimos 15 min)
   - Obtener eventos del ECS service

2. **Job `generate-rca`** (needs: collect-logs):
   - Generar `rca-report.md`:
     - **Qué falló**: error del log
     - **Dónde falló**: servicio AWS afectado
     - **Siguiente acción**: recomendación de fix

3. Upload artefactos: `rca-report.md`, `ecs-logs.txt`, `ecs-events.json`

## Definition of Done
- [ ] Logs recolectados de CloudWatch
- [ ] `rca-report.md` generado
- [ ] Solo se ejecuta si SIT falla (`if: failure()`)
- [ ] Artefactos adjuntos
- [ ] `actionlint` pasa"""
    },
    {
        "title": "Pipeline #8: Validación de seguridad y calidad (audit)",
        "agent": "supermario-quality",
        "body": """## Objetivo
Audit completo de seguridad y calidad sobre todos los workflows y Terraform.

## Tareas
1. **Syntax validation:**
   - `actionlint .github/workflows/*.yml` → 0 errores
   - `terraform validate` y `terraform fmt -check`

2. **Security checklist:**
   - [ ] Todos los workflows tienen `permissions:` block
   - [ ] AWS auth usa secrets (no hardcoded)
   - [ ] Secrets no expuestos en logs
   - [ ] Third-party actions pinned to SHA
   - [ ] No hay `pull_request_target` sin protección

3. **Quality checklist:**
   - [ ] `concurrency:` configurado
   - [ ] Cache para Maven y npm
   - [ ] Health checks con retry
   - [ ] Steps con nombres descriptivos
   - [ ] Sin duplicación entre workflows

4. **Terraform security:**
   - [ ] IAM least privilege
   - [ ] Security groups restrictivos
   - [ ] Recursos tagueados

5. Crear issue de seguimiento si hay findings

## Definition of Done
- [ ] 0 errores en actionlint
- [ ] Security checklist 100%
- [ ] Quality checklist 100%
- [ ] Terraform validate y fmt pasan
- [ ] Informe de findings en el PR"""
    },
    {
        "title": "Pipeline #9: Consolidación — refactor + composite actions",
        "agent": "supermario-refactor",
        "body": """## Objetivo
Refactorizar workflows para eliminar duplicación, extraer composite actions, documentar.

## Tareas
1. **Extraer composite actions:**
   - `.github/actions/aws-auth/action.yml` — configurar AWS credentials (reutilizado en deploy, sit, rca)
   - `.github/actions/upload-evidence/action.yml` — subir artefactos de evidencia con metadata

2. **Optimizar workflows:**
   - Reemplazar steps duplicados con composite actions
   - Consolidar inputs/secrets comunes
   - Verificar comportamiento idéntico

3. **Actualizar documentación:**
   - Sección "Pipeline CI/CD" en `RUNBOOK.md`:
     - Cómo configurar GitHub Secrets
     - Cómo ejecutar pipeline (workflow_dispatch)
     - Cómo ver evidencias (artefactos)
     - Troubleshooting

4. **Verificación final:**
   - `actionlint` pasa en todos los workflows
   - Composite actions funcionan

## Definition of Done
- [ ] Composite actions extraídas y funcionando
- [ ] 0 duplicación entre workflows
- [ ] RUNBOOK.md actualizado con sección de pipeline
- [ ] `actionlint` pasa post-refactor"""
    }
]


def create_issue(issue_data):
    """Create a single GitHub issue via gh api."""
    payload = {
        "title": issue_data["title"],
        "body": issue_data["body"],
        "labels": LABELS
    }

    result = subprocess.run(
        ["gh", "api", "--method", "POST",
         "-H", "Accept: application/vnd.github+json",
         "-H", "X-GitHub-Api-Version: 2022-11-28",
         f"/repos/{REPO}/issues",
         "--input", "-"],
        input=json.dumps(payload),
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"  ERROR: {result.stderr.strip()}")
        return None

    data = json.loads(result.stdout)
    return {"number": data["number"], "title": data["title"], "url": data["html_url"]}


def assign_copilot(issue_number, custom_agent):
    """Assign Copilot coding agent with custom agent to an issue."""
    payload = {
        "assignees": ["copilot-swe-agent[bot]"]
    }

    # First assign the bot
    result = subprocess.run(
        ["gh", "api", "--method", "POST",
         "-H", "Accept: application/vnd.github+json",
         "-H", "X-GitHub-Api-Version: 2022-11-28",
         f"/repos/{REPO}/issues/{issue_number}/assignees",
         "--input", "-"],
        input=json.dumps(payload),
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"  ASSIGN ERROR: {result.stderr.strip()}")
        return False

    print(f"  Assigned copilot-swe-agent[bot] to #{issue_number}")
    return True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "create"

    if mode == "create":
        print(f"Creating {len(ISSUES)} issues in {REPO}...\n")
        created = []
        for i, issue in enumerate(ISSUES, 1):
            print(f"[{i}/{len(ISSUES)}] {issue['title']}")
            result = create_issue(issue)
            if result:
                print(f"  ✓ #{result['number']} — {result['url']}")
                created.append({**result, "agent": issue["agent"]})
            else:
                print(f"  ✗ Failed")
            time.sleep(1)  # Rate limit

        print(f"\n{'='*60}")
        print(f"Created {len(created)}/{len(ISSUES)} issues\n")
        print("Issue map:")
        for c in created:
            print(f"  #{c['number']:>3} [{c['agent']}] {c['title']}")

        print(f"\nTo assign Copilot to an issue:")
        print(f"  python3 scripts/create-pipeline-issues.py assign <issue_number>")

    elif mode == "assign":
        if len(sys.argv) < 3:
            print("Usage: python3 scripts/create-pipeline-issues.py assign <issue_number>")
            sys.exit(1)
        issue_num = int(sys.argv[2])
        # Find agent for this issue
        agent = sys.argv[3] if len(sys.argv) > 3 else None
        if not agent:
            print(f"Assigning copilot-swe-agent[bot] to #{issue_num}...")
        assign_copilot(issue_num, agent)

    else:
        print(f"Unknown mode: {mode}")
        print("Usage: python3 scripts/create-pipeline-issues.py [create|assign <number>]")
        sys.exit(1)


if __name__ == "__main__":
    main()
