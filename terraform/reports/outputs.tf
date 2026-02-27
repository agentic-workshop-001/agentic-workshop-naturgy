output "reports_bucket_name" {
  description = "Name of the S3 bucket hosting the test reports"
  value       = aws_s3_bucket.reports.id
}


