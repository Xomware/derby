terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.75"
    }
  }
}

provider "aws" {
  region = var.aws_region
  # Auth via AWS CLI profile, env vars, or IAM role. No hardcoded credentials.
}
