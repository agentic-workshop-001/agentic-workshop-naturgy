output "reports_bucket_name" {
  description = "Name of the S3 bucket hosting test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_url" {
  description = "Public URL of the CloudFront distribution for test reports"
  value       = "https://${aws_cloudfront_distribution.reports.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.reports.id
}
