# Manual de Ejecución — Workshop Agentic IA + DevOps

## Introducción

Este manual describe paso a paso cómo ejecutar la demo de **GitHub Copilot Coding Agent** aplicado a DevOps. El resultado final: dos agentes de IA generan automáticamente la infraestructura AWS (Terraform) y los workflows CI/CD (GitHub Actions) para publicar reports de testing en la nube.

### ¿Qué se demuestra?

| Agente | Qué hace | Output |
|--------|----------|--------|
| **Agente 1** (devops-sre) | Genera código Terraform (S3 + CloudFront) | `terraform/reports/` (4 ficheros) |
| **Agente 2** (supermario-developer) | Genera workflows de GitHub Actions | `.github/workflows/` (2 ficheros) |

Al terminar, los reports de JaCoCo (backend) y Vitest (frontend) se sirven públicamente vía CloudFront con HTTPS.

---

## Prerrequisitos

### 1. Software local

| Herramienta | Versión | Instalación |
|-------------|---------|-------------|
| `git` | >= 2.30 | `sudo apt install git` |
| `gh` (GitHub CLI) | >= 2.40 | `sudo apt install gh` o [cli.github.com](https://cli.github.com/) |
| `aws` (AWS CLI v2) | >= 2.0 | [docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| `jq` | >= 1.6 | `sudo apt install jq` |

### 2. Acceso GitHub

- **Cuenta GitHub** con acceso al repositorio
- **GitHub CLI autenticado**: ejecutar `gh auth login` si no está configurado
- **Copilot Coding Agent** habilitado en el repositorio (Settings → Copilot → Coding agent → **Enable**)
- **Labels creados**: `infrastructure` y `ci-cd` (se crean una sola vez)

### 3. Acceso AWS

| Dato | Valor | Dónde se usa |
|------|-------|--------------|
| AWS Account ID | `223876296831` | Referencia |
| IAM User | `simon.serrano.lara@accenture.com` | Credenciales estáticas |
| IAM Role | `AWS_223876296831_PoC-Naturgy-IA-TDLC` | Role assumption (full access) |
| Region | `eu-west-1` | Todos los recursos |

> **Nota**: El usuario IAM tiene permisos mínimos. Los permisos reales vienen del rol `PoC-Naturgy-IA-TDLC` que se asume en cada workflow.

### 4. Secrets de GitHub (configuración única)

Los siguientes secrets deben existir en el repositorio (Settings → Secrets and variables → Actions):

| Secret | Valor |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Access key del usuario IAM |
| `AWS_SECRET_ACCESS_KEY` | Secret key del usuario IAM |
| `AWS_REGION` | `eu-west-1` |

```bash
# Configurar desde terminal (una sola vez):
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION -b "eu-west-1"
```

---

## Estructura del Repositorio

```
agentic-workshop-naturgy/
├── backend/                    # Spring Boot (Java 17, Maven)
├── frontend/                   # React 18 + Vite + TypeScript (Node 20)
├── reports/                    # Dashboard HTML de reports (plantilla)
├── _data/                      # Datos de referencia y specs
├── .github/
│   ├── agents/                 # Agentes custom de Copilot (11 agentes)
│   ├── copilot-instructions.md # Instrucciones globales para Copilot
│   └── workflows/
│       ├── ci.yml              # Pipeline CI/CD principal (build + test)
│       └── reusable-build-test.yml  # Workflow reutilizable
├── demo.sh                     # 🚀 Script principal de demo
├── cleanup.sh                  # 🧹 Script de limpieza AWS
└── MANUAL.md                   # Este fichero
```

### Ramas

| Rama | Propósito |
|------|-----------|
| `base` | Punto de partida limpio. Contiene la app, agents e instrucciones. **No tiene** Terraform ni workflows de infra/deploy. **No se modifica.** |
| `main` | Rama de trabajo. Se resetea a `base` para cada demo. Los agentes generan código aquí. |

---

## Ejecución de la Demo

### Paso 0: Clonar el repositorio (solo la primera vez)

```bash
git clone https://github.com/agentic-workshop-001/agentic-workshop-naturgy.git
cd agentic-workshop-naturgy
```

### Paso 1: Lanzar la demo

```bash
./demo.sh
```

Este script hace automáticamente:

1. **Verifica** prerrequisitos (gh CLI, secrets, rama `base`)
2. **Cierra** issues abiertos anteriores
3. **Cancela** workflows en ejecución
4. **Resetea** `main` al contenido de `base` (force push)
5. **Crea Issue #1**: "Create AWS infrastructure for test reports" → asignado a **Copilot**
6. **Crea Issue #2**: "Create GitHub Actions workflows" → asignado a **Copilot**

**Output esperado:**
```
═══════════════════════════════════════════════
  Preflight checks
═══════════════════════════════════════════════
✓ gh CLI authenticated
✓ Secret AWS_ACCESS_KEY_ID exists
✓ Secret AWS_SECRET_ACCESS_KEY exists
✓ Secret AWS_REGION exists
✓ Branch 'base' exists on remote

═══════════════════════════════════════════════
  Step 1: Reset main → base
═══════════════════════════════════════════════
✓ Open issues closed
✓ Running workflows cancelled
✓ main reset to base and force-pushed

═══════════════════════════════════════════════
  Step 2: Create infrastructure issue
═══════════════════════════════════════════════
✓ Issue #XX created: Infrastructure

═══════════════════════════════════════════════
  Step 3: Create workflows issue
═══════════════════════════════════════════════
✓ Issue #YY created: Workflows

═══════════════════════════════════════════════
  Step 4: Assign Copilot (manual step required)
═══════════════════════════════════════════════
⚠ Copilot Coding Agent cannot be assigned via the API.
⚠ You must assign it manually using the GitHub web UI.

  Open each issue and click 'Assign → Copilot':

  1. https://github.com/.../issues/XX
  2. https://github.com/.../issues/YY

═══════════════════════════════════════════════
  Demo launched!
═══════════════════════════════════════════════
```

#### Opciones del script

| Comando | Efecto |
|---------|--------|
| `./demo.sh` | Reset completo + crear issues |
| `./demo.sh --issues-only` | Solo crear issues (sin resetear main) |
| `./demo.sh --cleanup` | Ejecutar cleanup AWS antes de la demo |

### Paso 2: Asignar Copilot a los issues (manual)

El script `demo.sh` no puede asignar Copilot automáticamente (es una limitación de la API de GitHub). Hay que hacerlo manualmente:

1. Abrir cada issue en el navegador (el script imprime las URLs)
2. En la barra lateral derecha, hacer clic en **"Assignees"**
3. Seleccionar **"Copilot"** de la lista
4. Repetir para el segundo issue

> **Nota**: Sin esta asignación, Copilot NO empezará a trabajar.

### Paso 3: Esperar a que Copilot genere los PRs (~5-15 min)

Una vez **asignado Copilot a ambos issues**, empezará a trabajar automáticamente. Se puede seguir el progreso en:

- **Issues**: https://github.com/agentic-workshop-001/agentic-workshop-naturgy/issues
- **Pull Requests**: https://github.com/agentic-workshop-001/agentic-workshop-naturgy/pulls

Copilot creará **dos Pull Requests**, una por cada issue:

| PR | Contenido esperado | Ficheros generados |
|----|--------------------|--------------------|
| PR de infraestructura | Módulo Terraform completo | `terraform/reports/main.tf`, `variables.tf`, `s3.tf`, `outputs.tf` |
| PR de workflows | Workflows de GitHub Actions | `.github/workflows/create-reports-infra.yml`, `deploy-reports.yml` |

> **Tip**: Se puede seguir el progreso de Copilot en tiempo real desde el propio issue (aparece un timeline con el estado del agente).

### Paso 3: Revisar y hacer merge de los PRs

**Orden de merge importante:**

1. **Primero**: Merge PR de **infraestructura** (terraform)
2. **Después**: Merge PR de **workflows**

> Los workflows referencian el directorio `terraform/reports/`, así que la infra debe existir primero.

**Qué verificar en la review (opcional):**
- [ ] Todos los recursos Terraform tienen tag `Application = "poc-naturgy"`
- [ ] Backend usa `local {}` (no S3 state)
- [ ] Los actions están pinned a SHA con comentario de versión
- [ ] Los workflows tienen `permissions:` y `concurrency:`
- [ ] AWS credentials usan `role-to-assume` con `role-skip-session-tagging: true`

### Paso 4: Ejecutar el workflow de Infraestructura

Ir a **Actions** → **"Infra: Create Reports S3"** → **Run workflow**

O desde terminal:
```bash
gh workflow run "create-reports-infra.yml"
```

Este workflow:
1. Configura credenciales AWS (con role assumption)
2. Inicializa Terraform
3. Crea: S3 bucket + CloudFront Distribution + OAC + Bucket Policy
4. Muestra la URL de CloudFront en el **Step Summary**

**Duración esperada**: ~3-4 minutos

**Resultado en Step Summary:**

| Resource | Value |
|----------|-------|
| S3 Bucket | `naturgy-gas-reports-dev` |
| CloudFront Distribution | `EXXXXXXXXXX` |
| Reports URL | `https://dXXXXXXXXXX.cloudfront.net` |

### Paso 5: Ejecutar el workflow de Deploy

Ir a **Actions** → **"Deploy: Upload Reports to S3"** → **Run workflow**

O desde terminal:
```bash
gh workflow run "deploy-reports.yml"
```

Este workflow:
1. **Job 1**: Compila backend (Maven) + frontend (Vitest), genera reports de cobertura
2. **Job 2**: Sube reports a S3, invalida cache CloudFront

**Duración esperada**: ~2-3 minutos

### Paso 6: Acceder a los reports

Abrir la URL de CloudFront que aparece en el **Step Summary** del workflow:

| Report | URL |
|--------|-----|
| Dashboard | `https://dXXXXXXXXXX.cloudfront.net/index.html` |
| JaCoCo (Backend) | `https://dXXXXXXXXXX.cloudfront.net/jacoco/index.html` |
| Vitest (Frontend) | `https://dXXXXXXXXXX.cloudfront.net/vitest/index.html` |

> **Nota**: CloudFront puede tardar 1-2 minutos en propagar tras la primera subida.

---

## Limpieza de recursos AWS

Después de la demo, destruir los recursos para evitar costes:

### Opción A: Desde terminal local

```bash
# 1. Configurar credenciales AWS
export AWS_ACCESS_KEY_ID="<tu-access-key>"
export AWS_SECRET_ACCESS_KEY="<tu-secret-key>"
export AWS_DEFAULT_REGION="eu-west-1"

# 2. Asumir el rol (necesario para tener permisos)
CREDS=$(aws sts assume-role \
  --role-arn "arn:aws:iam::223876296831:role/AWS_223876296831_PoC-Naturgy-IA-TDLC" \
  --role-session-name "cleanup" --output json)
export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.Credentials.SessionToken')

# 3. Ejecutar cleanup
./cleanup.sh
```

### Opción B: Integrado en demo.sh

```bash
./demo.sh --cleanup    # limpia recursos → resetea repo → crea issues
```

### ¿Qué elimina cleanup.sh?

| Recurso | Nombre |
|---------|--------|
| CloudFront Distribution | (identificada por comment "Naturgy Gas test reports") |
| CloudFront OAC | `naturgy-gas-reports-oac` |
| S3 Bucket | `naturgy-gas-reports-dev` (vaciado + borrado) |

> **Atención**: La eliminación de la distribución CloudFront puede tardar **5-15 minutos** (AWS requiere deshabilitarla antes de borrarla).

---

## Repetir la Demo

Para ejecutar la demo de nuevo (ej: para otro cliente/audiencia):

```bash
# 1. (Opcional) Limpiar recursos AWS anteriores
./cleanup.sh

# 2. Lanzar demo
./demo.sh

# 3. Esperar PRs de Copilot → Merge → Ejecutar workflows → Mostrar reports
```

La demo se puede repetir **tantas veces como sea necesario**. Cada ejecución de `demo.sh`:
- Resetea `main` al estado limpio (`base`)
- Cierra issues y cancela workflows anteriores
- Crea issues frescos para Copilot

---

## Troubleshooting

### Copilot no crea PRs

- Verificar que **Copilot Coding Agent** está habilitado: Settings → Copilot → Coding agent
- Verificar que los issues están **asignados a `Copilot`** (ver columna Assignees)
- La asignación de Copilot **debe hacerse manualmente** desde la web UI del issue (Assignees → Copilot)
- La API de GitHub no soporta asignar Copilot Coding Agent programáticamente

### Workflow de infra falla en "Configure AWS credentials"

**Error**: `sts:AssumeRole not authorized`

- El usuario IAM no puede asumir el rol. Verificar:
  - La Trust Policy del rol incluye al usuario como principal
  - El usuario tiene `sts:AssumeRole` en su policy

**Error**: `sts:TagSession not authorized`

- Añadir `role-skip-session-tagging: true` en el bloque de credenciales

### Workflow de infra falla en "Terraform apply"

**Error**: `s3:CreateBucket AccessDenied`

- El rol no tiene permisos S3. Verificar la policy adjunta al rol `PoC-Naturgy-IA-TDLC`

**Error**: `cloudfront:CreateOriginAccessControl AccessDenied`

- El rol necesita permisos de CloudFront. Solicitar a seguridad.

### Workflow de deploy falla en "Build backend"

```bash
# Verificar localmente que el backend compila:
cd backend && mvn clean verify -B
```

### Workflow de deploy falla en "Build frontend"

```bash
# Verificar localmente que el frontend compila:
cd frontend && npm ci --legacy-peer-deps && npm run test:coverage
```

### Los reports se ven sin estilos (CSS no carga)

- Comprobar que CloudFront está correctamente configurado con OAC
- Esperar 1-2 minutos a que CloudFront propague
- Forzar invalidación manual:
  ```bash
  aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
  ```

### Error "Branch 'base' not found"

```bash
# La rama base no existe en el remote. Crearla:
git checkout -b base
# (asegurarse de que NO tiene terraform/ ni workflows de infra/deploy)
git push -u origin base
git checkout main
```

---

## Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
│                                                         │
│  ┌───────────┐    Issue #1     ┌────────────────────┐  │
│  │  demo.sh  │───────────────→│  Copilot Agent #1   │  │
│  │           │    Issue #2     │  (devops-sre)       │  │
│  │           │───────────────→│                      │  │
│  └───────────┘                │  Copilot Agent #2   │  │
│                               │  (supermario-dev)    │  │
│                               └──────────┬───────────┘  │
│                                          │ PRs          │
│                                          ▼              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  main branch (after merge)                       │   │
│  │  ├── terraform/reports/ ← Agent #1               │   │
│  │  └── .github/workflows/ ← Agent #2              │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                              │
│            ┌─────────────┴─────────────┐                │
│            ▼                           ▼                │
│  ┌─────────────────┐       ┌──────────────────────┐    │
│  │ Infra: Create    │       │ Deploy: Upload        │    │
│  │ Reports S3       │       │ Reports to S3         │    │
│  │ (workflow_dispatch)│     │ (workflow_dispatch)    │    │
│  └────────┬─────────┘       └──────────┬───────────┘    │
└───────────┼─────────────────────────────┼───────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│                        AWS (eu-west-1)                  │
│                                                         │
│  ┌─────────────────┐     ┌──────────────────────────┐  │
│  │  S3 Bucket       │◄────│  CloudFront Distribution  │  │
│  │  (private)       │ OAC │  (public HTTPS)           │  │
│  │  reports-dev     │     │  dXXX.cloudfront.net      │  │
│  └─────────────────┘     └──────────────────────────┘  │
│         ▲                          ▲                    │
│         │ s3 sync                  │ Browser            │
│         │                          │                    │
│    ┌────┴─────┐              ┌─────┴────┐              │
│    │ Reports  │              │ Usuarios │              │
│    │ JaCoCo + │              │          │              │
│    │ Vitest   │              └──────────┘              │
│    └──────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Contacto

| Rol | Persona |
|-----|---------|
| Setup técnico | Equipo de plataforma |
| Permisos AWS | Equipo de seguridad (cuenta 223876296831) |
| Repo GitHub | Org `agentic-workshop-001` |
