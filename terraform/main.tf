terraform {
  required_version = "~> 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to enable remote state storage
  # backend "s3" {
  #   bucket         = "naturgy-gas-terraform-state"
  #   key            = "naturgy-gas/terraform.tfstate"
  #   region         = "eu-west-1"
  #   dynamodb_table = "naturgy-gas-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Environment = var.environment
    Owner       = "naturgy"
    Project     = var.app_name
    ManagedBy   = "terraform"
  }
}
