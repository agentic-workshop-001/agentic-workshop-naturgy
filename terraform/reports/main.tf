terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local backend — state is ephemeral per workflow run.
  # For a POC this is acceptable; production should use S3 backend.
  backend "local" {}
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Application = "poc-naturgy"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "test-reports"
  }
}
