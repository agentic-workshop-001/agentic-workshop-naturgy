output "reports_bucket_name" {
  description = "Name of the S3 bucket hosting the test reports"
  value       = aws_s3_bucket.reports.id
}

output "reports_website_url" {
  description = "Public URL of the S3 static website"
  value       = aws_s3_bucket_website_configuration.reports.website_endpoint
}

