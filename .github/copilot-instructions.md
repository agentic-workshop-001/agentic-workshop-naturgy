# Naturgy Gas Workshop — Global Instructions

> This file is automatically loaded by GitHub Copilot (VS Code and coding agent).

## Project Overview

Full-stack gas billing application with CI/CD pipeline deployment to AWS.

- **Backend**: Spring Boot (Java 17, Maven) — `backend/`
- **Frontend**: React 18 + Vite + TypeScript (Node 20) — `frontend/`
- **IaC**: Terraform — `terraform/`
- **CI/CD**: GitHub Actions — `.github/workflows/`
- **Deploy target**: Frontend → S3, Backend → ECR + ECS Fargate behind ALB

## Cross-Cutting Rules

### Security (all files)
- No hardcoded secrets or credentials — use GitHub Secrets or AWS parameter store
- AWS authentication via secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Third-party GitHub Actions pinned to **commit SHA**, not mutable tags
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
- All resources tagged: Project, Environment, Owner, ManagedBy
- IAM follows least privilege — no wildcard policies
- Run `terraform fmt` and `terraform validate` before committing

### Docker
- Multi-stage builds for backend
- Base image: `eclipse-temurin:17-jre-alpine`
- Include `HEALTHCHECK` instruction

### Quality
- Validate workflows with `actionlint` before merge
- Backend tests: `mvn test` (JUnit 5 + JaCoCo)
- Frontend tests: `npx vitest run --coverage`
- Reports in `reports/` directory (JaCoCo + Vitest)

## Custom Agents

This repo uses custom agents in `.github/agents/`:

| Agent | Purpose |
|-------|---------|
| `supermario-developer` | Creates GitHub Actions workflows and pipeline structure |
| `supermario-quality` | Validates workflows for security, syntax, and quality |
| `supermario-refactor` | Refactors pipelines: composite actions, DRY, caching |
| `devops-sre` | Creates Terraform IaC, Dockerfiles, AWS infrastructure |

Each agent is self-contained with its specialized rules inlined.
