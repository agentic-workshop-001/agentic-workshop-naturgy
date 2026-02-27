# ── S3 Bucket for Test Reports ─────────────────────────────────────────────────
# Public S3 static website serving JaCoCo + Vitest reports.

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${var.environment}"
  force_destroy = true

  tags = local.common_tags
}

# ── Website configuration ──────────────────────────────────────────────────────
resource "aws_s3_bucket_website_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# ── Public access ──────────────────────────────────────────────────────────────
resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "reports_public_read" {
  bucket     = aws_s3_bucket.reports.id
  depends_on = [aws_s3_bucket_public_access_block.reports]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.reports.arn}/*"
    }]
  })
}
