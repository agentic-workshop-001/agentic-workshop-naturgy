#!/usr/bin/env bash
# ============================================================
# cleanup.sh — Destroy AWS resources created by the demo
#
# Removes: S3 reports bucket, CloudFront distribution + OAC,
#          S3 bucket policy.
#
# Usage:
#   export AWS_PROFILE=naturgy   # or set AWS_ACCESS_KEY_ID etc.
#   ./cleanup.sh [environment]   # default: dev
#
# Requires: aws cli v2, jq
# ============================================================
set -euo pipefail

ENV="${1:-dev}"
PROJECT="naturgy-gas"
BUCKET="${PROJECT}-reports-${ENV}"
CF_COMMENT="Naturgy Gas test reports"

echo "╔════════════════════════════════════════════════════╗"
echo "║  Cleaning up AWS resources (env: ${ENV})          ║"
echo "╚════════════════════════════════════════════════════╝"

# ── 1. Find CloudFront distribution ────────────────────────
echo ""
echo "→ Looking for CloudFront distribution..."
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${CF_COMMENT}'].Id" \
  --output text 2>/dev/null || echo "")

if [[ -n "$DIST_ID" && "$DIST_ID" != "None" ]]; then
  echo "  Found distribution: $DIST_ID"

  # Check if distribution is enabled
  DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$DIST_ID")
  ETAG=$(echo "$DIST_CONFIG" | jq -r '.ETag')
  IS_ENABLED=$(echo "$DIST_CONFIG" | jq -r '.DistributionConfig.Enabled')

  if [[ "$IS_ENABLED" == "true" ]]; then
    echo "  Disabling distribution (required before deletion)..."
    DISABLE_CONFIG=$(echo "$DIST_CONFIG" | jq '.DistributionConfig.Enabled = false | .DistributionConfig')
    aws cloudfront update-distribution \
      --id "$DIST_ID" \
      --if-match "$ETAG" \
      --distribution-config "$DISABLE_CONFIG" > /dev/null

    echo "  Waiting for distribution to deploy (this can take 5-15 min)..."
    aws cloudfront wait distribution-deployed --id "$DIST_ID"

    # Get updated ETag after disable
    ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" | jq -r '.ETag')
  fi

  echo "  Deleting CloudFront distribution..."
  aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$ETAG"
  echo "  ✓ Distribution deleted"
else
  echo "  No CloudFront distribution found — skipping"
fi

# ── 2. Delete CloudFront OAC ──────────────────────────────
echo ""
echo "→ Looking for Origin Access Control..."
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${PROJECT}-reports-oac'].Id" \
  --output text 2>/dev/null || echo "")

if [[ -n "$OAC_ID" && "$OAC_ID" != "None" ]]; then
  echo "  Found OAC: $OAC_ID"
  OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" | jq -r '.ETag')
  aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG"
  echo "  ✓ OAC deleted"
else
  echo "  No OAC found — skipping"
fi

# ── 3. Empty and delete S3 bucket ─────────────────────────
echo ""
echo "→ Looking for S3 bucket: ${BUCKET}..."
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  Found bucket — emptying..."
  aws s3 rm "s3://${BUCKET}" --recursive
  echo "  Deleting bucket..."
  aws s3api delete-bucket --bucket "$BUCKET"
  echo "  ✓ Bucket deleted"
else
  echo "  Bucket not found — skipping"
fi

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  ✓ Cleanup complete                               ║"
echo "╚════════════════════════════════════════════════════╝"
