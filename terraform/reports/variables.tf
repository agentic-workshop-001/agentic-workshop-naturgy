variable "aws_region" {
  description = "AWS region to deploy resources"
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
  description = "7-character hex identifier derived from the repository name for multi-tenant isolation"
  type        = string
  validation {
    condition     = can(regex("^[a-f0-9]{7}$", var.repo_hash))
    error_message = "repo_hash must be exactly 7 lowercase hexadecimal characters."
  }
}
