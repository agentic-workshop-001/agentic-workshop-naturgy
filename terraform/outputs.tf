output "frontend_url" {
  description = "HTTP URL of the S3 static website hosting the React frontend"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "backend_url" {
  description = "HTTP URL of the Application Load Balancer fronting the ECS backend service"
  value       = "http://${aws_lb.app.dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL used to push and pull the backend container image"
  value       = aws_ecr_repository.app.repository_url
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket hosting the frontend static assets"
  value       = aws_s3_bucket.frontend.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster running the backend service"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service running the backend container"
  value       = aws_ecs_service.app.name
}
