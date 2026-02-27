output "reports_bucket_name" {
  description = "Name of the S3 bucket hosting the test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_url" {
  description = "Public URL of the reports (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.reports.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.reports.id
}

