variable "aws_region" {
  description = "AWS region where resources will be deployed"
  type        = string
  default     = "eu-west-1"

  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
      "eu-north-1", "eu-south-1",
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
      "ap-northeast-2", "ap-northeast-3", "ap-south-1",
      "sa-east-1", "ca-central-1", "me-south-1", "af-south-1"
    ], var.aws_region)
    error_message = "Must be a valid AWS region identifier (e.g. eu-west-1, us-east-1)."
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "app_name" {
  description = "Application name used as a prefix for all resource names"
  type        = string
  default     = "naturgy-gas"
}

variable "app_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 8080
}
