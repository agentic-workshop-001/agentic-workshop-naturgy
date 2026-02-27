variable "aws_region" {
  description = "AWS region where the reports bucket will be created"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used as prefix for resource names"
  type        = string
  default     = "naturgy-gas"
}
