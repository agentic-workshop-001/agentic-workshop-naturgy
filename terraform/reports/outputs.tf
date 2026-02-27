output "reports_bucket_name" {
  description = "The name (ID) of the S3 bucket used to store test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_url" {
  description = "The public HTTPS URL for accessing test reports via CloudFront"
  value       = "https://${aws_cloudfront_distribution.reports.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution serving the test reports"
  value       = aws_cloudfront_distribution.reports.id
}
