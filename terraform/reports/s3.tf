# ── S3 Bucket for Test Reports ─────────────────────────────────────────────────
# Bucket is PRIVATE. Access is via presigned URLs generated at deploy time.

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${var.environment}"
  force_destroy = true

  tags = local.common_tags
}
