variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "naturgy-gas"
}

variable "repo_hash" {
  description = "7-character hex hash derived from the GitHub repository name for multi-tenant isolation"
  type        = string

  validation {
    condition     = can(regex("^[a-f0-9]{7}$", var.repo_hash))
    error_message = "repo_hash must be exactly 7 lowercase hex characters."
  }
}
