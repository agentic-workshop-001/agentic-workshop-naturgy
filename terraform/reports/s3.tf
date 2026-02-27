# ── S3 Bucket for Test Reports ─────────────────────────────────────────────────
# Objects are made public-read via ACLs at upload time (avoids bucket policy,
# which is blocked by an account-level SCP).

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${var.environment}"
  force_destroy = true

  tags = local.common_tags
}

# Allow per-object ACLs (needed for --acl public-read on sync)
resource "aws_s3_bucket_ownership_controls" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    object_ownership = "ObjectWriter"
  }
}

# Permit public ACLs on this bucket
resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = false
  block_public_policy     = true # keep policy blocked (SCP denies it anyway)
  ignore_public_acls      = false
  restrict_public_buckets = false
}
