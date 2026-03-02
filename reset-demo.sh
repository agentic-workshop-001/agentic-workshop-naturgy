#!/usr/bin/env bash
# ============================================================
# reset-demo.sh — Prepare the repo for a fresh client demo
#
# Cleans up everything so the client starts from zero:
#   1. Closes all open issues
#   2. Closes all open pull requests
#   3. Deletes copilot/* branches
#   4. Cancels running/queued workflows
#   5. Resets main → base and force-pushes
#   6. (Optional) Destroys AWS resources (--aws flag)
#
# After running this, the client can create issues manually
# and assign Copilot to generate the infrastructure + workflows.
#
# Usage:
#   ./reset-demo.sh              # full reset (git + GitHub)
#   ./reset-demo.sh --aws        # also destroy AWS resources
#   ./reset-demo.sh --aws-only   # only destroy AWS resources
#
# Prerequisites:
#   - gh CLI authenticated
#   - git with push access to the repo
#   - aws CLI (only if --aws or --aws-only)
# ============================================================
set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q '.nameWithOwner')"
BASE_BRANCH="base"
MAIN_BRANCH="main"

# ── AWS config (for --aws cleanup) ────────────────────────
PROJECT="naturgy-gas"
ENV="dev"
REPO_HASH=$(echo -n "$REPO" | sha256sum | cut -c1-7)
BUCKET="${PROJECT}-reports-${ENV}-${REPO_HASH}"
CF_COMMENT="Naturgy Gas test reports ${REPO_HASH}"

# ── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
err()   { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"; echo -e "${BLUE}  $*${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════${NC}"; }

# ── Parse args ─────────────────────────────────────────────
DO_AWS=false
AWS_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --aws)      DO_AWS=true ;;
    --aws-only) AWS_ONLY=true; DO_AWS=true ;;
    --help|-h)
      echo "Usage: $0 [--aws] [--aws-only] [--help]"
      echo ""
      echo "  (default)    Reset git + close issues/PRs + cancel workflows"
      echo "  --aws        Also destroy AWS resources (S3 + CloudFront)"
      echo "  --aws-only   Only destroy AWS resources, skip git reset"
      exit 0 ;;
  esac
done

# ── Preflight checks ──────────────────────────────────────
header "Preflight checks"

command -v gh >/dev/null   || { err "gh CLI not found"; exit 1; }
command -v git >/dev/null  || { err "git not found"; exit 1; }
gh auth status &>/dev/null || { err "gh not authenticated — run 'gh auth login'"; exit 1; }
ok "gh CLI authenticated"

if [[ "$DO_AWS" == "true" ]]; then
  command -v aws >/dev/null || { err "aws CLI not found (needed for --aws)"; exit 1; }
  command -v jq >/dev/null  || { err "jq not found (needed for --aws)"; exit 1; }
  ok "aws CLI + jq available"
fi

# ═══════════════════════════════════════════════════════════
# AWS CLEANUP (optional)
# ═══════════════════════════════════════════════════════════
if [[ "$DO_AWS" == "true" ]]; then
  header "Destroying AWS resources"

  # ── CloudFront distribution ──────────────────────────────
  info "Looking for CloudFront distribution..."
  DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${CF_COMMENT}'].Id" \
    --output text 2>/dev/null || echo "")

  if [[ -n "$DIST_ID" && "$DIST_ID" != "None" ]]; then
    info "Found distribution: $DIST_ID"

    DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$DIST_ID")
    ETAG=$(echo "$DIST_CONFIG" | jq -r '.ETag')
    IS_ENABLED=$(echo "$DIST_CONFIG" | jq -r '.DistributionConfig.Enabled')

    if [[ "$IS_ENABLED" == "true" ]]; then
      info "Disabling distribution (required before deletion)..."
      DISABLE_CONFIG=$(echo "$DIST_CONFIG" | jq '.DistributionConfig.Enabled = false | .DistributionConfig')
      aws cloudfront update-distribution \
        --id "$DIST_ID" \
        --if-match "$ETAG" \
        --distribution-config "$DISABLE_CONFIG" > /dev/null

      info "Waiting for distribution to deploy (5-15 min)..."
      aws cloudfront wait distribution-deployed --id "$DIST_ID"

      ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" | jq -r '.ETag')
    fi

    aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$ETAG"
    ok "CloudFront distribution deleted"
  else
    info "No CloudFront distribution found — skipping"
  fi

  # ── CloudFront OAC ──────────────────────────────────────
  info "Looking for Origin Access Control..."
  OAC_ID=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${PROJECT}-reports-oac-${REPO_HASH}'].Id" \
    --output text 2>/dev/null || echo "")

  if [[ -n "$OAC_ID" && "$OAC_ID" != "None" ]]; then
    OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" | jq -r '.ETag')
    aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG"
    ok "OAC deleted"
  else
    info "No OAC found — skipping"
  fi

  # ── S3 bucket ───────────────────────────────────────────
  info "Looking for S3 bucket: ${BUCKET}..."
  if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    aws s3 rm "s3://${BUCKET}" --recursive
    aws s3api delete-bucket --bucket "$BUCKET"
    ok "S3 bucket deleted"
  else
    info "Bucket not found — skipping"
  fi

  ok "AWS cleanup complete"

  if [[ "$AWS_ONLY" == "true" ]]; then
    echo ""
    ok "Done (--aws-only mode)"
    exit 0
  fi
fi

# ═══════════════════════════════════════════════════════════
# GITHUB CLEANUP (issues, PRs, workflows, branches)
# ═══════════════════════════════════════════════════════════

# ── 1. Close all open issues ──────────────────────────────
header "Step 1: Close open issues"

OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --json number -q '.[].number' 2>/dev/null || echo "")
if [[ -n "$OPEN_ISSUES" ]]; then
  for issue_num in $OPEN_ISSUES; do
    gh issue close "$issue_num" --repo "$REPO" --reason "not planned" 2>/dev/null || true
    info "Closed issue #${issue_num}"
  done
  ok "All open issues closed"
else
  info "No open issues found"
fi

# ── 2. Close all open pull requests ───────────────────────
header "Step 2: Close open pull requests"

OPEN_PRS=$(gh pr list --repo "$REPO" --state open --json number -q '.[].number' 2>/dev/null || echo "")
if [[ -n "$OPEN_PRS" ]]; then
  for pr_num in $OPEN_PRS; do
    gh pr close "$pr_num" --repo "$REPO" --delete-branch 2>/dev/null || true
    info "Closed PR #${pr_num} and deleted branch"
  done
  ok "All open PRs closed"
else
  info "No open PRs found"
fi

# ── 3. Delete copilot/* remote branches ──────────────────
header "Step 3: Delete copilot/* branches"

COPILOT_BRANCHES=$(git ls-remote --heads origin 'refs/heads/copilot/*' 2>/dev/null | awk '{print $2}' | sed 's|refs/heads/||' || echo "")
if [[ -n "$COPILOT_BRANCHES" ]]; then
  for branch in $COPILOT_BRANCHES; do
    git push origin --delete "$branch" 2>/dev/null || true
    info "Deleted branch: $branch"
  done
  ok "Copilot branches cleaned up"
else
  info "No copilot/* branches found"
fi

# ── 4. Cancel running/queued workflows ───────────────────
header "Step 4: Cancel running workflows"

for status in in_progress queued; do
  RUNS=$(gh run list --repo "$REPO" --status "$status" --json databaseId -q '.[].databaseId' 2>/dev/null || echo "")
  for run_id in $RUNS; do
    gh run cancel "$run_id" --repo "$REPO" 2>/dev/null || true
    info "Cancelled workflow run $run_id"
  done
done
ok "All workflows cancelled"

# ── 5. Ensure labels exist ───────────────────────────────
header "Step 5: Ensure labels exist"

for label in infrastructure ci-cd; do
  EXISTS=$(gh api "/repos/${REPO}/labels/${label}" --jq '.name' 2>/dev/null || echo "")
  if [[ "$EXISTS" == "$label" ]]; then
    ok "Label '$label' exists"
  else
    gh api --method POST "/repos/${REPO}/labels" \
      -f name="$label" -f description="Auto-created for demo" -f color="0E8A16" \
      --silent 2>/dev/null || true
    ok "Label '$label' created"
  fi
done

# ── 6. Reset main → base ────────────────────────────────
header "Step 6: Reset main → base"

if git ls-remote --heads origin "$BASE_BRANCH" | grep -q "$BASE_BRANCH"; then
  git fetch origin
  git checkout "$MAIN_BRANCH" 2>/dev/null || git checkout -b "$MAIN_BRANCH" "origin/$BASE_BRANCH"
  git reset --hard "origin/$BASE_BRANCH"
  git push --force origin "$MAIN_BRANCH"
  ok "main reset to base and force-pushed"
else
  err "Branch '$BASE_BRANCH' not found on remote — cannot reset"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────
header "Reset complete — ready for demo!"
echo ""
echo "  Repo: https://github.com/${REPO}"
echo ""
echo "  The client can now create issues manually in GitHub"
echo "  and assign Copilot to each one."
echo ""
echo "  Suggested issue order:"
echo "    1. Infraestructura Terraform (assign to Copilot → devops-sre agent)"
echo "    2. Workflows de GitHub Actions (assign to Copilot → supermario-developer agent)"
echo ""
echo "  After merging both PRs:"
echo "    3. Run 'Infra: Create Reports S3' workflow"
echo "    4. Run 'Deploy: Upload Reports to S3' workflow (or push to main)"
echo "    5. Open the CloudFront URL from the workflow summary"
echo ""
