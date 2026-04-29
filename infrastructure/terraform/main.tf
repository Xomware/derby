terraform {
  backend "s3" {
    bucket         = "xomware-terraform-state"
    key            = "derby/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "xomware-terraform-locks"
    encrypt        = true
  }
}

data "aws_caller_identity" "current" {}
