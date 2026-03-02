# Naturgy Gas Workshop — Global Instructions

> This file is automatically loaded by GitHub Copilot (VS Code and coding agent).

## Project Overview

Full-stack gas billing application with CI/CD pipeline deployment to AWS.

- **Backend**: Spring Boot (Java 17, Maven) — `backend/`
- **Frontend**: React 18 + Vite + TypeScript (Node 20) — `frontend/`
- **IaC**: Terraform — `terraform/`
- **CI/CD**: GitHub Actions — `.github/workflows/`
- **Deploy target**: Frontend → S3, Backend → ECR + ECS Fargate behind ALB

## AWS Workshop Environment

| Setting | Value |
|---------|-------|
| Account ID | `223876296831` |
| Region | `eu-west-1` |
| IAM Role | `arn:aws:iam::223876296831:role/AWS_223876296831_PoC-Naturgy-IA-TDLC` |
| Auth | Static keys + role assumption (`role-skip-session-tagging: true`) |

### Known Quirks
- **AWS_REGION secret has trailing whitespace** — always sanitize:
  ```yaml
  - name: Sanitise AWS region
    id: clean
    run: |
      REGION="$(echo -n "${{ secrets.AWS_REGION }}" | tr -d '[:space:]')"
      echo "::add-mask::$REGION"
      echo "aws_region=$REGION" >> "$GITHUB_OUTPUT"
  ```
- **AWS auth pattern** (static keys + role assumption):
  ```yaml
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@5579c002bb4778aa43395ef1df492868a9a1c83f # v4.0.2
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: ${{ steps.clean.outputs.aws_region }}
      role-to-assume: arn:aws:iam::223876296831:role/AWS_223876296831_PoC-Naturgy-IA-TDLC
      role-duration-seconds: 3600
      role-skip-session-tagging: true
  ```
- **Frontend npm** requires `--legacy-peer-deps` (React 19 peer dep conflict)

### Verified Action SHAs (MUST use these exact SHAs)

| Action | SHA | Version |
|--------|-----|---------|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4.2.2 |
| `actions/setup-java` | `3a4f6e1af504cf6a31855fa899c6aa5355ba6c12` | v4.7.0 |
| `actions/setup-node` | `cdca7365b2dadb8aad0a33bc7601856ffabcc48e` | v4.3.0 |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4.6.2 |
| `actions/download-artifact` | `95815c38cf2ff2164869cbab79da8d1f422bc89e` | v4.2.1 |
| `aws-actions/configure-aws-credentials` | `5579c002bb4778aa43395ef1df492868a9a1c83f` | v4.0.2 |
| `hashicorp/setup-terraform` | `b9cd54a3c349d3f38e8881555d616ced269862dd` | v3.1.2 |

## Cross-Cutting Rules

### Security (all files)
- No hardcoded secrets or credentials — use GitHub Secrets or AWS parameter store
- AWS authentication via secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) + role assumption (see AWS auth pattern above)
- Third-party GitHub Actions pinned to **commit SHA**, not mutable tags (see SHA table above)
- All workflows must have explicit `permissions:` block with minimal scope
- No secrets exposed in logs (`::add-mask::` for dynamic sensitive values)

### GitHub Actions Workflows (`.github/workflows/`)
- Reusable workflow pattern: orchestrator `ci.yml` calls `reusable-*.yml`
- Every workflow needs: `permissions:`, `concurrency:`, descriptive step names
- Cache Maven (`setup-java` with `cache: maven`) and npm (`setup-node` with `cache: 'npm'`)
- Pin all third-party actions to SHA with version comment: `uses: actions/checkout@<sha> # v4.1.1`

### Terraform (`terraform/`)
- Modular structure: one module per AWS service (networking, ecr, ecs, alb, s3-frontend, iam)
- All variables need `description`, `type`, and `validation` where applicable
- All resources tagged with: `Application = "poc-naturgy"`, Project, Environment, ManagedBy
- IAM follows least privilege — no wildcard policies
- Run `terraform fmt` and `terraform validate` before committing
- **Backend: `local {}`** (no S3 remote state — this is a POC)

### Reports Infrastructure Convention
When someone asks to "publish reports", "see reports in the cloud", "host reports on a URL", or any similar request, this is what it means:
- Reports = JaCoCo (backend Java coverage) + Vitest (frontend JS coverage) HTML files
- They live in `reports/` directory (JaCoCo in `reports/jacoco/`, Vitest in `reports/vitest/`)
- They must be served via **S3 + CloudFront with OAC** (Origin Access Control)
- Terraform module path: `terraform/reports/`
- S3 bucket name: `${project_name}-reports-${environment}` (default: `naturgy-gas-reports-dev`), `force_destroy = true`
- CloudFront OAC name: `${project_name}-reports-oac`
- CloudFront distribution comment: **exactly** `"Naturgy Gas test reports"` (used by deploy workflow to find the distribution)
- S3 bucket policy: allow `s3:GetObject` from CloudFront service principal, conditioned on `AWS:SourceArn`
- Terraform outputs: `reports_bucket_name`, `reports_url` (https://domain), `cloudfront_distribution_id`
- Variables: `aws_region` (default `eu-west-1`), `environment` (default `dev`), `project_name` (default `naturgy-gas`)
- `locals.common_tags` must include: `Application = "poc-naturgy"`, `Project = var.project_name`, `Environment = var.environment`, `ManagedBy = "terraform"`, `Purpose = "test-reports"`

### Docker
- Multi-stage builds for backend
- Base image: `eclipse-temurin:17-jre-alpine`
- Include `HEALTHCHECK` instruction

### Quality
- Validate workflows with `actionlint` before merge
- Backend tests: `mvn test` (JUnit 5 + JaCoCo)
- Frontend tests: `npx vitest run --coverage`
- Reports in `reports/` directory (JaCoCo + Vitest)

### Deploy Workflows Convention
When someone asks for "workflows to deploy reports", "CI/CD for the reports", or similar:
- **Infra workflow** (`create-reports-infra.yml`): name `"Infra: Create Reports S3"`, `workflow_dispatch` with input `environment` (default `dev`), runs terraform init/plan/apply on `terraform/reports/`, imports existing S3 bucket if present (idempotent), shows URL in GITHUB_STEP_SUMMARY
- **Deploy workflow** (`deploy-reports.yml`): name `"Deploy: Upload Reports to S3"`, triggers on `workflow_dispatch` + `workflow_run` (on `"CI/CD Pipeline"` success on main), Job 1 builds backend (`mvn clean verify -B`) + copies jacoco to reports + builds frontend (`npm ci --legacy-peer-deps && npm run test:coverage`), Job 2 syncs `reports/` to S3 and invalidates CloudFront cache (find dist by comment `"Naturgy Gas test reports"`), prints CloudFront URLs in GITHUB_STEP_SUMMARY
- Both workflows MUST sanitize AWS_REGION and use role assumption (see AWS patterns above)
- `vitest.config.ts` writes coverage to `../reports/vitest` automatically

## Custom Agents

This repo uses custom agents in `.github/agents/`:

| Agent | Purpose |
|-------|---------|
| `supermario-developer` | Creates GitHub Actions workflows and pipeline structure |
| `supermario-quality` | Validates workflows for security, syntax, and quality |
| `supermario-refactor` | Refactors pipelines: composite actions, DRY, caching |
| `devops-sre` | Creates Terraform IaC, Dockerfiles, AWS infrastructure |

Each agent is self-contained with its specialized rules inlined.
