# ── S3 Bucket for Test Reports ─────────────────────────────────────────────────

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${var.environment}"
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_bucket_website_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# ── CloudFront OAC (serves private bucket as public website) ──────────────────

resource "aws_cloudfront_origin_access_control" "reports" {
  name                              = "${var.project_name}-reports-oac"
  description                       = "OAC for reports S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "reports" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "Naturgy Gas test reports"

  origin {
    domain_name              = aws_s3_bucket.reports.bucket_regional_domain_name
    origin_id                = "s3-reports"
    origin_access_control_id = aws_cloudfront_origin_access_control.reports.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-reports"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 3600
  }

  # SPA fallback — serve index.html for 403/404
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

# ── Bucket Policy: Allow only CloudFront OAC ──────────────────────────────────

resource "aws_s3_bucket_policy" "reports" {
  bucket = aws_s3_bucket.reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.reports.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.reports.arn
        }
      }
    }]
  })
}
