output "reports_bucket_name" {
  description = "Name of the S3 bucket that stores test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_url" {
  description = "Public HTTPS URL of the test reports dashboard (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.reports.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.reports.id
}
