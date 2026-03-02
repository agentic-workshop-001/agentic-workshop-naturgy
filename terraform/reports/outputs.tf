output "reports_bucket_name" {
  description = "Name of the S3 bucket storing test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_url" {
  description = "HTTPS URL to access the test reports via CloudFront"
  value       = "https://${aws_cloudfront_distribution.reports.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution serving test reports"
  value       = aws_cloudfront_distribution.reports.id
}
