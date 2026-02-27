#!/usr/bin/env bash
# ============================================================
# demo.sh — Full demo reset & launch
#
# Resets `main` to `base`, force-pushes, then creates GitHub
# issues that Copilot coding agent will pick up to:
#   1. Generate Terraform infrastructure (S3 + CloudFront)
#   2. Generate deployment workflows
#
# Prerequisites:
#   - `gh` CLI authenticated
#   - GitHub Secrets already configured:
#     AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
#   - Copilot Coding Agent enabled on the repo
#
# Usage:
#   ./demo.sh                    # full reset + create issues
#   ./demo.sh --issues-only      # skip reset, just create issues
#   ./demo.sh --cleanup          # destroy AWS resources first
# ============================================================
set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q '.nameWithOwner')"
BASE_BRANCH="base"
MAIN_BRANCH="main"

# ── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
err()   { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"; echo -e "${BLUE}  $*${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════${NC}"; }

# ── Parse args ─────────────────────────────────────────────
SKIP_RESET=false
DO_CLEANUP=false
for arg in "$@"; do
  case "$arg" in
    --issues-only) SKIP_RESET=true ;;
    --cleanup)     DO_CLEANUP=true ;;
    --help|-h)
      echo "Usage: $0 [--issues-only] [--cleanup] [--help]"
      echo "  --issues-only   Skip git reset, just create issues"
      echo "  --cleanup       Run cleanup.sh before demo"
      exit 0 ;;
  esac
done

# ── Preflight checks ──────────────────────────────────────
header "Preflight checks"

command -v gh >/dev/null   || { err "gh CLI not found"; exit 1; }
command -v git >/dev/null  || { err "git not found"; exit 1; }
gh auth status &>/dev/null || { err "gh not authenticated — run 'gh auth login'"; exit 1; }
ok "gh CLI authenticated"

# Verify secrets exist
for secret in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
  if gh secret list --repo "$REPO" | grep -q "$secret"; then
    ok "Secret $secret exists"
  else
    err "Secret $secret missing — set it with: gh secret set $secret"
    exit 1
  fi
done

# Verify base branch exists
if git ls-remote --heads origin "$BASE_BRANCH" | grep -q "$BASE_BRANCH"; then
  ok "Branch '$BASE_BRANCH' exists on remote"
else
  err "Branch '$BASE_BRANCH' not found — create it first"
  exit 1
fi

# ── Optional cleanup ──────────────────────────────────────
if [[ "$DO_CLEANUP" == "true" ]]; then
  header "Cleaning up AWS resources"
  if [[ -f "./cleanup.sh" ]]; then
    bash ./cleanup.sh
  else
    warn "cleanup.sh not found — skipping"
  fi
fi

# ── Step 1: Reset main → base ─────────────────────────────
if [[ "$SKIP_RESET" == "false" ]]; then
  header "Step 1: Reset main → base"

  # Close any open issues assigned to copilot
  info "Closing existing Copilot issues..."
  OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --json number -q '.[].number' 2>/dev/null || echo "")
  for issue_num in $OPEN_ISSUES; do
    gh issue close "$issue_num" --repo "$REPO" --reason "not planned" 2>/dev/null || true
  done
  ok "Open issues closed"

  # Cancel any running workflows
  info "Cancelling running workflows..."
  RUNNING=$(gh run list --repo "$REPO" --status in_progress --json databaseId -q '.[].databaseId' 2>/dev/null || echo "")
  for run_id in $RUNNING; do
    gh run cancel "$run_id" --repo "$REPO" 2>/dev/null || true
  done
  QUEUED=$(gh run list --repo "$REPO" --status queued --json databaseId -q '.[].databaseId' 2>/dev/null || echo "")
  for run_id in $QUEUED; do
    gh run cancel "$run_id" --repo "$REPO" 2>/dev/null || true
  done
  ok "Running workflows cancelled"

  # Reset
  info "Resetting main to base..."
  git fetch origin
  git checkout "$MAIN_BRANCH"
  git reset --hard "origin/$BASE_BRANCH"
  git push --force origin "$MAIN_BRANCH"
  ok "main reset to base and force-pushed"
else
  info "Skipping reset (--issues-only mode)"
fi

# ── Step 2: Create Issue #1 — Infrastructure (devops-sre) ─
header "Step 2: Create infrastructure issue"

ISSUE1_TITLE="Create AWS infrastructure for test reports (S3 + CloudFront)"
ISSUE1_BODY='## Objective

Create the Terraform infrastructure to host test reports (JaCoCo + Vitest) publicly via **S3 + CloudFront with OAC**.

## Agent

Use the `devops-sre` agent role.

## Requirements

### Terraform Module: `terraform/reports/`

Create the following files:

#### `terraform/reports/main.tf`
- `required_version >= 1.0`
- Provider: `hashicorp/aws ~> 5.0`
- **Backend: `local {}`** (no S3 state — this is a POC)
- `locals.common_tags` must include:
  - `Application = "poc-naturgy"`
  - `Project = var.project_name`
  - `Environment = var.environment`
  - `ManagedBy = "terraform"`
  - `Purpose = "test-reports"`

#### `terraform/reports/variables.tf`
- `aws_region` (string, default `"eu-west-1"`)
- `environment` (string, default `"dev"`)
- `project_name` (string, default `"naturgy-gas"`)

#### `terraform/reports/s3.tf`
- **S3 bucket**: `"${var.project_name}-reports-${var.environment}"`, `force_destroy = true`, tagged with `local.common_tags`
- **CloudFront Origin Access Control**: name `"${var.project_name}-reports-oac"`, type `s3`, signing `always`/`sigv4`
- **CloudFront Distribution**:
  - `default_root_object = "index.html"`
  - `comment = "Naturgy Gas test reports"` (this exact comment is used by the deploy workflow to find the distribution)
  - Origin pointing to S3 bucket with OAC
  - Viewer protocol: `redirect-to-https`
  - Cache TTL: `min=0, default=300, max=3600`
  - No geo restrictions
  - Default CloudFront certificate
  - Tagged with `local.common_tags`
- **S3 bucket policy**: Allow `s3:GetObject` from CloudFront service principal, conditioned on `AWS:SourceArn` matching the distribution ARN

#### `terraform/reports/outputs.tf`
- `reports_bucket_name` — S3 bucket ID
- `reports_url` — `"https://${cloudfront_distribution.domain_name}"`
- `cloudfront_distribution_id` — distribution ID

### Validation
- Run `terraform fmt` and `terraform validate` on the module
- Ensure all resources are tagged

## Acceptance Criteria
- [ ] `terraform/reports/main.tf` exists with local backend
- [ ] `terraform/reports/variables.tf` exists with 3 variables
- [ ] `terraform/reports/s3.tf` exists with S3 + CloudFront + OAC + bucket policy
- [ ] `terraform/reports/outputs.tf` exists with 3 outputs
- [ ] All resources tagged with `Application = "poc-naturgy"`
- [ ] `terraform validate` passes'

ISSUE1_NUM=$(gh issue create \
  --repo "$REPO" \
  --title "$ISSUE1_TITLE" \
  --body "$ISSUE1_BODY" \
  --label "infrastructure" \
  2>&1 | grep -oP '\d+$')

ok "Issue #${ISSUE1_NUM} created: Infrastructure"
ISSUE1_URL="https://github.com/${REPO}/issues/${ISSUE1_NUM}"

# ── Step 3: Create Issue #2 — Workflows (supermario-developer) ─
header "Step 3: Create workflows issue"

ISSUE2_TITLE="Create GitHub Actions workflows for reports infrastructure and deployment"
ISSUE2_BODY='## Objective

Create two GitHub Actions workflows to deploy test reports to AWS.

## Agent

Use the `supermario-developer` agent role.

## Context

The repo will have a Terraform module at `terraform/reports/` (created by a separate issue). These workflows manage that infrastructure and upload reports.

**AWS authentication**: The workflows must authenticate with static keys AND then assume a role:
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

**AWS_REGION secret has trailing whitespace** — always sanitize:
```yaml
- name: Sanitise AWS region
  id: clean
  run: |
    REGION="$(echo -n "${{ secrets.AWS_REGION }}" | tr -d '\''[:space:]'\'')"
    echo "::add-mask::$REGION"
    echo "aws_region=$REGION" >> "$GITHUB_OUTPUT"
```

## Verified Action SHAs (MUST use these exact SHAs)

| Action | SHA | Version |
|--------|-----|---------|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4.2.2 |
| `actions/setup-java` | `3a4f6e1af504cf6a31855fa899c6aa5355ba6c12` | v4.7.0 |
| `actions/setup-node` | `cdca7365b2dadb8aad0a33bc7601856ffabcc48e` | v4.3.0 |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4.6.2 |
| `actions/download-artifact` | `95815c38cf2ff2164869cbab79da8d1f422bc89e` | v4.2.1 |
| `aws-actions/configure-aws-credentials` | `5579c002bb4778aa43395ef1df492868a9a1c83f` | v4.0.2 |
| `hashicorp/setup-terraform` | `b9cd54a3c349d3f38e8881555d616ced269862dd` | v3.1.2 |

## Requirements

### Workflow 1: `.github/workflows/create-reports-infra.yml`

```
name: "Infra: Create Reports S3"
trigger: workflow_dispatch (input: environment, default "dev")
permissions: contents: read
concurrency: group: reports-infra, cancel-in-progress: false
```

**Job: Terraform – Reports S3**
1. Checkout
2. Sanitise AWS region (see pattern above)
3. Configure AWS credentials (with role assumption — see pattern above)
4. Setup Terraform (terraform_wrapper: false)
5. Terraform init
6. Import existing S3 bucket if it exists (idempotent):
   ```bash
   BUCKET_NAME="naturgy-gas-reports-${{ inputs.environment }}"
   if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
     terraform import aws_s3_bucket.reports "$BUCKET_NAME" || true
   fi
   ```
7. Terraform plan (pass aws_region and environment vars, -out=tfplan)
8. Terraform apply
9. Show Reports URL in GITHUB_STEP_SUMMARY (table with bucket, distribution ID, URL)

### Workflow 2: `.github/workflows/deploy-reports.yml`

```
name: "Deploy: Upload Reports to S3"
trigger: workflow_dispatch + workflow_run (on "CI/CD Pipeline" success on main)
permissions: contents: read
concurrency: group: deploy-reports, cancel-in-progress: true
```

**Job 1: Generate Reports**
- Only run if dispatch OR workflow_run.conclusion == success
- Checkout, setup Java 17 (temurin, cache maven), `mvn clean verify -B`
- Copy `backend/target/site/jacoco` to `reports/jacoco`
- Setup Node 20 (cache npm), `npm ci --legacy-peer-deps && npm run test:coverage`
- Upload reports/ as artifact (retention 7 days)

**Job 2: Upload Reports to S3** (needs: build-reports)
- Download artifact
- Sanitise AWS region
- Configure AWS credentials (with role assumption)
- `aws s3 sync reports/ s3://naturgy-gas-reports-dev --delete`
- Invalidate CloudFront cache (find distribution by comment "Naturgy Gas test reports")
- Print reports URLs in GITHUB_STEP_SUMMARY (dashboard, jacoco, vitest links via CloudFront domain)

### Important details
- The frontend uses `--legacy-peer-deps` for npm ci (React 19 peer dep conflict)
- vitest.config.ts writes coverage to `../reports/vitest` automatically
- The CloudFront distribution is identified by its `comment` field: `"Naturgy Gas test reports"`
- S3 bucket name: `naturgy-gas-reports-dev` (or `naturgy-gas-reports-${environment}`)

## Acceptance Criteria
- [ ] `.github/workflows/create-reports-infra.yml` exists and is valid YAML
- [ ] `.github/workflows/deploy-reports.yml` exists and is valid YAML
- [ ] All actions pinned to SHA with version comment
- [ ] Explicit `permissions:` block on both workflows
- [ ] `concurrency:` block on both workflows
- [ ] AWS credentials use role assumption with `role-skip-session-tagging: true`
- [ ] Region sanitized in both workflows'

ISSUE2_NUM=$(gh issue create \
  --repo "$REPO" \
  --title "$ISSUE2_TITLE" \
  --body "$ISSUE2_BODY" \
  --label "ci-cd" \
  2>&1 | grep -oP '\d+$')

ok "Issue #${ISSUE2_NUM} created: Workflows"
ISSUE2_URL="https://github.com/${REPO}/issues/${ISSUE2_NUM}"

# ── Step 4: Manual Copilot assignment ──────────────────────
header "Step 4: Assign Copilot (manual step required)"
echo ""
warn "Copilot Coding Agent cannot be assigned via the API."
warn "You must assign it manually using the GitHub web UI."
echo ""
echo "  Open each issue and click 'Assign → Copilot':"
echo ""
echo "  1. ${ISSUE1_URL}"
echo "  2. ${ISSUE2_URL}"
echo ""

# ── Summary ────────────────────────────────────────────────
header "Demo launched!"
echo ""
echo "  Repo:     https://github.com/${REPO}"
echo "  Issue #${ISSUE1_NUM}: Infrastructure (devops-sre)"
echo "  Issue #${ISSUE2_NUM}: Workflows (supermario-developer)"
echo ""
echo "  Next steps:"
echo "  1. ⚠️  Assign Copilot to both issues (links above)"
echo "  2. Wait for Copilot to create PRs for both issues"
echo "  3. Review and merge PR for Issue #${ISSUE1_NUM} first (infrastructure)"
echo "  4. Review and merge PR for Issue #${ISSUE2_NUM} (workflows)"
echo "  5. Run 'Infra: Create Reports S3' workflow"
echo "  6. Run 'Deploy: Upload Reports to S3' workflow"
echo "  7. Open the CloudFront URL from the workflow summary"
echo ""
info "To clean up AWS resources after the demo: ./cleanup.sh"
