variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "naturgy-gas"
}

variable "repo_hash" {
  description = "Short hash derived from the GitHub repo name — avoids S3/CloudFront naming collisions when multiple repos share the same AWS account. Generated automatically by workflows: echo -n \"$GITHUB_REPOSITORY\" | sha256sum | cut -c1-7"
  type        = string

  validation {
    condition     = can(regex("^[a-f0-9]{7}$", var.repo_hash))
    error_message = "repo_hash must be exactly 7 lowercase hex characters."
  }
}
