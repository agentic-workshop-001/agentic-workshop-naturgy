#!/usr/bin/env bash
# =============================================================================
# sit-tests.sh — System Integration Tests for Naturgy Gas Workshop
#
# Required environment variables:
#   BACKEND_URL   Base URL of the deployed backend ALB  (no trailing slash)
#                 e.g. http://my-alb.eu-west-1.elb.amazonaws.com
#   FRONTEND_URL  URL of the deployed frontend S3 site  (no trailing slash)
#                 e.g. http://my-bucket.s3-website-eu-west-1.amazonaws.com
#
# Outputs:
#   sit-results.json   — JSON evidence report
#   invoice.pdf        — First invoice PDF downloaded from the API
#
# Exit codes:
#   0  All assertions passed
#   1  One or more assertions failed
# =============================================================================
set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────────────

log()  { echo "[SIT] $(date -u +%Y-%m-%dT%H:%M:%SZ)  $*"; }
fail() { log "FAIL: $*"; exit 1; }

require_var() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    fail "Required environment variable '\$${var_name}' is not set."
  fi
}

# Mask secret-like values (URLs may contain credentials)
mask_if_set() {
  local val="${1:-}"
  if [[ -n "$val" ]]; then
    echo "::add-mask::${val}"
  fi
}

# curl wrapper: -f → fail on 4xx/5xx, --max-time → hard timeout per request
# Usage: http_get <url> [extra curl flags…]
http_get() {
  local url="$1"; shift
  curl --silent --fail --max-time 30 "$@" "$url"
}

http_post() {
  local url="$1"; shift
  curl --silent --fail --max-time 60 "$@" \
       --request POST \
       --header "Content-Type: application/json" \
       "$url"
}

# Parse item count from a JSON response that may be a flat array or
# a Spring Page object with a "content" array.
count_items() {
  echo "$1" | jq 'if type == "array" then length else (.content // . | if type == "array" then length else 0 end) end'
}

# ── Validate required inputs ──────────────────────────────────────────────────

require_var BACKEND_URL
require_var FRONTEND_URL

# Mask URLs so they do not appear as plain text in downstream log lines
mask_if_set "$BACKEND_URL"
mask_if_set "$FRONTEND_URL"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Starting SIT run — backend=${BACKEND_URL}  frontend=${FRONTEND_URL}"

# ── Initialise result accumulators ───────────────────────────────────────────

SUPPLY_POINTS_COUNT=0
BILLING_STATUS="not_run"
INVOICES_COUNT=0
PDF_VALID="false"
OVERALL_RESULT="failure"

# ── Step 1: Backend health-check with retry ───────────────────────────────────
# Uses GET /api/gas/supply-points as the readiness probe; retries up to 10×
# with 10 s back-off between attempts.

log "Step 1: Waiting for backend to become ready…"

MAX_RETRIES=10
RETRY_SLEEP=10
ATTEMPT=0
BACKEND_READY=false

while [[ $ATTEMPT -lt $MAX_RETRIES ]]; do
  ATTEMPT=$(( ATTEMPT + 1 ))
  log "  Health-check attempt ${ATTEMPT}/${MAX_RETRIES} → GET ${BACKEND_URL}/api/gas/supply-points"

  HTTP_CODE=$(curl --silent --output /dev/null --write-out "%{http_code}" \
                   --max-time 15 \
                   "${BACKEND_URL}/api/gas/supply-points" || true)

  if [[ "$HTTP_CODE" == "200" ]]; then
    log "  Backend responded HTTP 200 — ready."
    BACKEND_READY=true
    break
  else
    log "  Got HTTP ${HTTP_CODE}. Waiting ${RETRY_SLEEP}s before retry…"
    sleep "$RETRY_SLEEP"
  fi
done

if [[ "$BACKEND_READY" != "true" ]]; then
  fail "Backend did not become ready after ${MAX_RETRIES} attempts."
fi

# ── Step 2: Verify supply-points are seeded ───────────────────────────────────

log "Step 2: Verifying seeded supply-points…"
SUPPLY_POINTS_RESPONSE=$(http_get "${BACKEND_URL}/api/gas/supply-points")

SUPPLY_POINTS_COUNT=$(count_items "$SUPPLY_POINTS_RESPONSE")
log "  Supply-points found: ${SUPPLY_POINTS_COUNT}"

if [[ "$SUPPLY_POINTS_COUNT" -le 0 ]]; then
  fail "Expected supply-points count > 0 but got ${SUPPLY_POINTS_COUNT}. Database seeding may have failed."
fi

# ── Step 3: Run billing ───────────────────────────────────────────────────────

log "Step 3: Executing billing run → POST ${BACKEND_URL}/api/gas/billing/run"
BILLING_HTTP_CODE=$(curl --silent --output /dev/null --write-out "%{http_code}" \
                         --max-time 60 \
                         --request POST \
                         --header "Content-Type: application/json" \
                         "${BACKEND_URL}/api/gas/billing/run" || true)
log "  Billing HTTP status: ${BILLING_HTTP_CODE}"

if [[ "$BILLING_HTTP_CODE" =~ ^2[0-9]{2}$ ]]; then
  BILLING_STATUS="success"
  log "  Billing run completed successfully."
else
  fail "Billing run returned HTTP ${BILLING_HTTP_CODE}. Expected 2xx."
fi

# ── Step 4: Verify invoices were generated ────────────────────────────────────

log "Step 4: Verifying invoices were generated…"
INVOICES_RESPONSE=$(http_get "${BACKEND_URL}/api/gas/invoices")

INVOICES_COUNT=$(count_items "$INVOICES_RESPONSE")
log "  Invoices found: ${INVOICES_COUNT}"

if [[ "$INVOICES_COUNT" -le 0 ]]; then
  fail "Expected invoices count > 0 but got ${INVOICES_COUNT}. Billing may not have produced any invoices."
fi

# ── Step 5: Download first invoice PDF ───────────────────────────────────────

log "Step 5: Downloading first invoice PDF…"

# Extract the ID of the first invoice; handle both array and paginated responses
FIRST_INVOICE_ID=$(echo "$INVOICES_RESPONSE" | \
  jq -r 'if type == "array" then .[0].id else (.content // .)[0].id end')

if [[ -z "$FIRST_INVOICE_ID" || "$FIRST_INVOICE_ID" == "null" ]]; then
  fail "Could not extract invoice ID from response: ${INVOICES_RESPONSE}"
fi

log "  Fetching PDF for invoice id=${FIRST_INVOICE_ID}"
curl --silent --fail --max-time 60 \
     --output invoice.pdf \
     "${BACKEND_URL}/api/gas/invoices/${FIRST_INVOICE_ID}/pdf"

# ── Step 6: Verify invoice.pdf magic bytes ───────────────────────────────────

log "Step 6: Verifying PDF magic bytes (%PDF)…"

# Read the first 4 bytes and compare to the PDF signature
PDF_HEADER=$(head -c 4 invoice.pdf 2>/dev/null || true)

if [[ "$PDF_HEADER" == "%PDF" ]]; then
  PDF_VALID="true"
  log "  PDF signature verified — file is a valid PDF."
else
  # Non-fatal: log and record but still write evidence before failing
  log "  WARNING: invoice.pdf does not start with '%PDF' (got: ${PDF_HEADER})"
  PDF_VALID="false"
fi

# ── Step 7: Write evidence JSON ───────────────────────────────────────────────

log "Step 7: Writing sit-results.json…"

# Determine overall result: all assertions above must have passed to reach here
# (set -e would have exited early otherwise), plus the PDF check.
if [[ "$PDF_VALID" == "true" ]]; then
  OVERALL_RESULT="success"
else
  OVERALL_RESULT="failure"
fi

jq --null-input \
   --arg  timestamp            "$TIMESTAMP" \
   --arg  backend_url          "$BACKEND_URL" \
   --arg  frontend_url         "$FRONTEND_URL" \
   --argjson supply_points_count "$SUPPLY_POINTS_COUNT" \
   --arg  billing_status       "$BILLING_STATUS" \
   --argjson invoices_count    "$INVOICES_COUNT" \
   --arg  pdf_valid            "$PDF_VALID" \
   --arg  overall_result       "$OVERALL_RESULT" \
   '{
      timestamp:            $timestamp,
      backend_url:          $backend_url,
      frontend_url:         $frontend_url,
      supply_points_count:  $supply_points_count,
      billing_status:       $billing_status,
      invoices_count:       $invoices_count,
      pdf_valid:            ($pdf_valid == "true"),
      overall_result:       $overall_result
    }' > sit-results.json

log "sit-results.json written:"
cat sit-results.json

# ── Final assertion ───────────────────────────────────────────────────────────

if [[ "$OVERALL_RESULT" != "success" ]]; then
  fail "SIT run finished with result='${OVERALL_RESULT}'. Check sit-results.json for details."
fi

log "All SIT assertions passed. overall_result=success"
