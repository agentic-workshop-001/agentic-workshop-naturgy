terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

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
    Purpose     = "frontend-hosting"
  }

  bucket_name = "${var.project_name}-frontend-${var.environment}-${var.repo_hash}"
  oac_name    = "${var.project_name}-frontend-oac-${var.repo_hash}"
  cf_comment  = "Naturgy Gas frontend ${var.repo_hash}"
}
