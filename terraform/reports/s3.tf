# ── S3 Bucket for Test Reports ─────────────────────────────────────────────────
# Private bucket for report storage. Public viewing is via GitHub Pages.

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${var.environment}"
  force_destroy = true

  tags = local.common_tags
}
