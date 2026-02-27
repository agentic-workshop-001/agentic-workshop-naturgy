output "reports_bucket_name" {
  description = "Name of the S3 bucket hosting the test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_base_url" {
  description = "Base URL (HTTPS) for the reports bucket"
  value       = "https://${aws_s3_bucket.reports.bucket_regional_domain_name}"
}
